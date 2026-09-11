package businessseat

import (
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ProvisioningService struct{}

func NewProvisioningService() *ProvisioningService {
	return &ProvisioningService{}
}

type PaymentConfirmInput struct {
	OrderNo         string
	ProviderTradeNo string
	PaidAmount      decimal.Decimal
	Currency        string
	PaymentChannel  string
}

func lockBusinessSeatRow(tx *gorm.DB) *gorm.DB {
	if common.UsingMainDatabase(common.DatabaseTypeSQLite) {
		return tx
	}
	return tx.Clauses(clause.Locking{Strength: "UPDATE"})
}

func (s *ProvisioningService) ProcessPayment(input PaymentConfirmInput) (*model.BusinessSeatOrder, error) {
	var result *model.BusinessSeatOrder
	err := model.DB.Transaction(func(tx *gorm.DB) error {
		var order model.BusinessSeatOrder
		if err := lockBusinessSeatRow(tx).Where("order_no = ?", input.OrderNo).First(&order).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return model.ErrBusinessOrderNotFound
			}
			return err
		}

		if order.Status == model.BusinessOrderStatusPaid {
			result = &order
			return nil
		}
		if order.Status != model.BusinessOrderStatusCreated && order.Status != model.BusinessOrderStatusPaying {
			return errors.New("order not payable")
		}

		expected := RoundMoney(order.TotalAmount, order.Currency)
		expectedCurrency := order.Currency
		if order.SettlementCurrency != "" && order.SettlementAmount.GreaterThan(decimal.Zero) {
			expected = RoundMoney(order.SettlementAmount, order.SettlementCurrency)
			expectedCurrency = order.SettlementCurrency
		}
		paid := RoundMoney(input.PaidAmount, input.Currency)
		if !expected.Equal(paid) {
			return fmt.Errorf("payment amount mismatch: expected %s got %s", expected, paid)
		}
		if expectedCurrency != input.Currency {
			return errors.New("payment currency mismatch")
		}

		if strings.TrimSpace(input.ProviderTradeNo) != "" {
			var existing model.BusinessSeatOrder
			err := tx.Where("provider_trade_no = ? AND id <> ?", input.ProviderTradeNo, order.Id).First(&existing).Error
			if err == nil {
				return fmt.Errorf("provider trade no already used")
			}
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
		}

		now := common.GetTimestamp()
		tradeNo := strings.TrimSpace(input.ProviderTradeNo)
		var providerTradeNo *string
		if tradeNo != "" {
			providerTradeNo = &tradeNo
		}
		if err := tx.Model(&order).Updates(map[string]interface{}{
			"status":              model.BusinessOrderStatusPaid,
			"payment_status":      "PAID",
			"provisioning_status": model.BusinessProvisioningStatusProcessing,
			"provider_trade_no":   providerTradeNo,
			"payment_channel":     input.PaymentChannel,
			"paid_at":             now,
		}).Error; err != nil {
			return err
		}
		order.Status = model.BusinessOrderStatusPaid
		order.PaidAt = &now

		if err := s.provisionAfterPayment(tx, &order); err != nil {
			return err
		}
		result = &order
		_ = model.RecordBusinessSeatAuditTx(tx, order.UserId, "PAYMENT_CONFIRMED", "order", order.Id,
			fmt.Sprintf("trade_no=%s", input.ProviderTradeNo))
		return nil
	})
	return result, err
}

func (s *ProvisioningService) provisionAfterPayment(tx *gorm.DB, order *model.BusinessSeatOrder) error {
	switch order.OrderType {
	case model.BusinessOrderTypeRenewal:
		return s.provisionRenewal(tx, order)
	case model.BusinessOrderTypeNew, model.BusinessOrderTypeReactivation:
		return s.provisionNewOrReactivation(tx, order)
	default:
		return fmt.Errorf("unsupported order type: %s", order.OrderType)
	}
}

func (s *ProvisioningService) provisionRenewal(tx *gorm.DB, order *model.BusinessSeatOrder) error {
	if order.SubscriptionId == nil {
		return errors.New("renewal order missing subscription")
	}
	var sub model.BusinessSeatSubscription
	if err := tx.First(&sub, *order.SubscriptionId).Error; err != nil {
		return err
	}

	if err := tx.Model(&sub).Updates(map[string]interface{}{
		"prepaid_through":          order.PrepaidThrough,
		"current_price_version_id": order.PriceVersionId,
		"last_order_id":            order.Id,
		"status":                   model.BusinessSubscriptionStatusActive,
	}).Error; err != nil {
		return err
	}

	if sub.SeatId != nil {
		_ = tx.Model(&model.BusinessSeat{}).Where("id = ?", *sub.SeatId).
			Update("status", model.BusinessSeatStatusActive).Error
	}

	if task, err := model.FindOpenBusinessSeatTaskTx(tx, model.BusinessTaskTypeRemoveMember, sub.Id); err == nil && task != nil {
		_ = tx.Model(task).Updates(map[string]interface{}{
			"status":       model.BusinessTaskStatusCancelled,
			"completed_at": common.GetTimestamp(),
		}).Error
	}

	_ = model.RecordBusinessSeatAuditTx(tx, order.UserId, "SUBSCRIPTION_RENEWED", "subscription", sub.Id, "")
	return tx.Model(order).Update("provisioning_status", model.BusinessProvisioningStatusCompleted).Error
}

func (s *ProvisioningService) provisionNewOrReactivation(tx *gorm.DB, order *model.BusinessSeatOrder) error {
	sub := model.BusinessSeatSubscription{
		UserId:                order.UserId,
		ProductId:             order.ProductId,
		WorkspaceId:           order.WorkspaceId,
		ChatgptEmail:          order.ChatgptEmail,
		Status:                model.BusinessSubscriptionStatusPendingActivation,
		PrepaidThrough:        order.PrepaidThrough,
		CurrentPriceVersionId: order.PriceVersionId,
		LastOrderId:           &order.Id,
	}
	if err := tx.Create(&sub).Error; err != nil {
		return err
	}
	order.SubscriptionId = &sub.Id
	if err := tx.Model(order).Update("subscription_id", sub.Id).Error; err != nil {
		return err
	}

	seat, err := s.reserveAvailableSeat(tx, order.WorkspaceId, sub.Id, order.UserId, order.ChatgptEmail)
	if err != nil {
		if errors.Is(err, model.ErrBusinessNoAvailableSeat) {
			sub.Status = model.BusinessSubscriptionStatusPendingCapacity
			if err := tx.Model(&sub).Update("status", sub.Status).Error; err != nil {
				return err
			}
			if err := s.createTaskIfNotExists(tx, model.BusinessTaskTypeAddSeat, order.WorkspaceId, &sub.Id, nil, &order.UserId, "+1 seat required"); err != nil {
				return err
			}
			_ = model.RecordBusinessSeatAuditTx(tx, 0, "SEAT_CAPACITY_REQUIRED", "subscription", sub.Id, "")
			return tx.Model(order).Update("provisioning_status", model.BusinessProvisioningStatusCompleted).Error
		}
		return err
	}

	sub.SeatId = &seat.Id
	if err := tx.Model(&sub).Updates(map[string]interface{}{
		"seat_id": seat.Id,
		"status":  model.BusinessSubscriptionStatusPendingActivation,
	}).Error; err != nil {
		return err
	}

	if err := s.createTaskIfNotExists(tx, model.BusinessTaskTypeInviteMember, order.WorkspaceId, &sub.Id, &seat.Id, &order.UserId, order.ChatgptEmail); err != nil {
		return err
	}
	_ = model.RecordBusinessSeatAuditTx(tx, 0, "SEAT_RESERVED", "seat", seat.Id, order.ChatgptEmail)
	return tx.Model(order).Update("provisioning_status", model.BusinessProvisioningStatusCompleted).Error
}

func (s *ProvisioningService) reserveAvailableSeat(tx *gorm.DB, workspaceId, subscriptionId, userId int, email string) (*model.BusinessSeat, error) {
	var seat model.BusinessSeat
	err := lockBusinessSeatRow(tx).
		Where("workspace_id = ? AND status = ?", workspaceId, model.BusinessSeatStatusAvailable).
		Order("seat_number asc").
		First(&seat).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, model.ErrBusinessNoAvailableSeat
		}
		return nil, err
	}
	now := common.GetTimestamp()
	result := tx.Model(&model.BusinessSeat{}).
		Where("id = ? AND status = ?", seat.Id, model.BusinessSeatStatusAvailable).
		Updates(map[string]interface{}{
			"status":          model.BusinessSeatStatusReserved,
			"subscription_id": subscriptionId,
			"user_id":         userId,
			"assigned_email":  email,
			"reserved_at":     now,
		})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, model.ErrBusinessNoAvailableSeat
	}
	if err := tx.First(&seat, seat.Id).Error; err != nil {
		return nil, err
	}
	return &seat, nil
}

func (s *ProvisioningService) createTaskIfNotExists(tx *gorm.DB, taskType string, workspaceId int, subscriptionId, seatId, userId *int, payload string) error {
	if subscriptionId != nil {
		var count int64
		if err := tx.Model(&model.BusinessSeatTask{}).
			Where("task_type = ? AND subscription_id = ? AND status = ?", taskType, *subscriptionId, model.BusinessTaskStatusOpen).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return nil
		}
	}
	task := model.BusinessSeatTask{
		TaskType:       taskType,
		Status:         model.BusinessTaskStatusOpen,
		WorkspaceId:    workspaceId,
		SubscriptionId: subscriptionId,
		SeatId:         seatId,
		UserId:         userId,
		Payload:        payload,
	}
	return tx.Create(&task).Error
}

func (s *ProvisioningService) ConfirmSeatAdded(actorId, workspaceId, subscriptionId int) error {
	return model.DB.Transaction(func(tx *gorm.DB) error {
		var sub model.BusinessSeatSubscription
		if err := tx.First(&sub, subscriptionId).Error; err != nil {
			return err
		}
		if sub.Status != model.BusinessSubscriptionStatusPendingCapacity {
			return errors.New("subscription not pending capacity")
		}

		seat, err := s.reserveAvailableSeat(tx, workspaceId, sub.Id, sub.UserId, sub.ChatgptEmail)
		if err != nil {
			return err
		}

		if err := tx.Model(&sub).Updates(map[string]interface{}{
			"seat_id": seat.Id,
			"status":  model.BusinessSubscriptionStatusPendingActivation,
		}).Error; err != nil {
			return err
		}

		if task, err := model.FindOpenBusinessSeatTaskTx(tx, model.BusinessTaskTypeAddSeat, sub.Id); err == nil && task != nil {
			_ = tx.Model(task).Updates(map[string]interface{}{
				"status":       model.BusinessTaskStatusDone,
				"completed_at": common.GetTimestamp(),
			}).Error
		}

		if err := s.createTaskIfNotExists(tx, model.BusinessTaskTypeInviteMember, workspaceId, &sub.Id, &seat.Id, &sub.UserId, sub.ChatgptEmail); err != nil {
			return err
		}
		_ = model.RecordBusinessSeatAuditTx(tx, actorId, "WORKSPACE_SEAT_COUNT_CHANGED", "subscription", sub.Id, "seat added and reserved")
		return nil
	})
}
