package businessseat

import (
	"errors"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

type SubscriptionService struct {
	prov *ProvisioningService
}

func NewSubscriptionService() *SubscriptionService {
	return &SubscriptionService{prov: NewProvisioningService()}
}

func (s *SubscriptionService) MarkInvited(actorId, subscriptionId int) error {
	return model.DB.Transaction(func(tx *gorm.DB) error {
		var sub model.BusinessSeatSubscription
		if err := tx.First(&sub, subscriptionId).Error; err != nil {
			return err
		}
		if sub.Status != model.BusinessSubscriptionStatusPendingActivation {
			return errors.New("subscription not pending activation")
		}
		now := common.GetTimestamp()
		if err := tx.Model(&sub).Updates(map[string]interface{}{
			"status":     model.BusinessSubscriptionStatusInvited,
			"invited_at": now,
		}).Error; err != nil {
			return err
		}
		if sub.SeatId != nil {
			_ = tx.Model(&model.BusinessSeat{}).Where("id = ?", *sub.SeatId).Updates(map[string]interface{}{
				"status":     model.BusinessSeatStatusInvited,
				"invited_at": now,
			}).Error
		}
		if task, err := model.FindOpenBusinessSeatTaskTx(tx, model.BusinessTaskTypeInviteMember, sub.Id); err == nil && task != nil {
			_ = tx.Model(task).Updates(map[string]interface{}{
				"status":       model.BusinessTaskStatusDone,
				"completed_at": now,
			}).Error
		}
		_ = model.RecordBusinessSeatAuditTx(tx, actorId, "INVITATION_MARKED_SENT", "subscription", sub.Id, "")
		return nil
	})
}

func (s *SubscriptionService) Activate(actorId, subscriptionId int) error {
	return model.DB.Transaction(func(tx *gorm.DB) error {
		var sub model.BusinessSeatSubscription
		if err := tx.First(&sub, subscriptionId).Error; err != nil {
			return err
		}
		if sub.Status != model.BusinessSubscriptionStatusInvited && sub.Status != model.BusinessSubscriptionStatusPendingActivation {
			return errors.New("subscription not ready for activation")
		}
		now := common.GetTimestamp()
		if err := tx.Model(&sub).Updates(map[string]interface{}{
			"status":          model.BusinessSubscriptionStatusActive,
			"activated_at":    now,
			"access_start_at": now,
		}).Error; err != nil {
			return err
		}
		if sub.SeatId != nil {
			_ = tx.Model(&model.BusinessSeat{}).Where("id = ?", *sub.SeatId).Updates(map[string]interface{}{
				"status":       model.BusinessSeatStatusActive,
				"activated_at": now,
			}).Error
		}
		_ = model.RecordBusinessSeatAuditTx(tx, actorId, "SUBSCRIPTION_ACTIVATED", "subscription", sub.Id, "")
		return nil
	})
}

func (s *SubscriptionService) ExpireSubscription(subscriptionId int) error {
	return model.DB.Transaction(func(tx *gorm.DB) error {
		var sub model.BusinessSeatSubscription
		if err := tx.First(&sub, subscriptionId).Error; err != nil {
			return err
		}
		if sub.Status != model.BusinessSubscriptionStatusActive && sub.Status != model.BusinessSubscriptionStatusExpiring {
			return nil
		}
		now := common.GetTimestamp()
		if err := tx.Model(&sub).Updates(map[string]interface{}{
			"status":     model.BusinessSubscriptionStatusPendingRemoval,
			"expired_at": now,
		}).Error; err != nil {
			return err
		}
		if sub.SeatId != nil {
			_ = tx.Model(&model.BusinessSeat{}).Where("id = ?", *sub.SeatId).
				Update("status", model.BusinessSeatStatusPendingRelease).Error
		}
		_ = s.prov.createTaskIfNotExists(tx, model.BusinessTaskTypeRemoveMember, sub.WorkspaceId, &sub.Id, sub.SeatId, &sub.UserId, sub.ChatgptEmail)
		_ = model.RecordBusinessSeatAuditTx(tx, 0, "REMOVAL_REQUESTED", "subscription", sub.Id, "")
		return nil
	})
}

func (s *SubscriptionService) ConfirmRemoved(actorId, subscriptionId int) error {
	return model.DB.Transaction(func(tx *gorm.DB) error {
		var sub model.BusinessSeatSubscription
		if err := tx.First(&sub, subscriptionId).Error; err != nil {
			return err
		}
		now := common.GetTimestamp()
		if err := tx.Model(&sub).Updates(map[string]interface{}{
			"status":     model.BusinessSubscriptionStatusRemoved,
			"removed_at": now,
		}).Error; err != nil {
			return err
		}
		if sub.SeatId != nil {
			_ = tx.Model(&model.BusinessSeat{}).Where("id = ?", *sub.SeatId).Updates(map[string]interface{}{
				"status":          model.BusinessSeatStatusAvailable,
				"subscription_id": nil,
				"user_id":         nil,
				"assigned_email":  "",
				"released_at":     now,
			}).Error
		}
		if task, err := model.FindOpenBusinessSeatTaskTx(tx, model.BusinessTaskTypeRemoveMember, sub.Id); err == nil && task != nil {
			_ = tx.Model(task).Updates(map[string]interface{}{
				"status":       model.BusinessTaskStatusDone,
				"completed_at": now,
			}).Error
		}
		_ = model.RecordBusinessSeatAuditTx(tx, actorId, "MEMBER_MARKED_REMOVED", "subscription", sub.Id, "")
		return nil
	})
}

func (s *SubscriptionService) CreateReactivationQuote(userId int, chatgptEmail string) (*model.BusinessQuote, error) {
	var removed model.BusinessSeatSubscription
	err := model.DB.Where("user_id = ? AND status = ?", userId, model.BusinessSubscriptionStatusRemoved).
		Order("id desc").First(&removed).Error
	if err != nil {
		return nil, errors.New("no removed subscription to reactivate")
	}
	quoteSvc := NewQuoteService()
	return quoteSvc.CreateQuote(QuoteInput{
		UserId:       userId,
		ProductId:    removed.ProductId,
		WorkspaceId:  removed.WorkspaceId,
		ChatgptEmail: chatgptEmail,
		OrderType:    model.BusinessOrderTypeReactivation,
	})
}
