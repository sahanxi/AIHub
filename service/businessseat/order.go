package businessseat

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/model"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type OrderService struct {
	quote *QuoteService
}

func NewOrderService() *OrderService {
	return &OrderService{quote: NewQuoteService()}
}

func (s *OrderService) CreateOrderFromQuote(userId, quoteId int, subscriptionId *int) (*model.BusinessSeatOrder, error) {
	if existing, err := model.GetPayableBusinessSeatOrderByQuoteId(quoteId, userId); err == nil {
		return existing, nil
	} else if err != nil && !errors.Is(err, model.ErrBusinessOrderNotFound) {
		return nil, err
	}

	quote, err := s.quote.ValidateQuoteForOrder(quoteId, userId)
	if err != nil {
		return nil, err
	}
	if quote.OrderType == model.BusinessOrderTypeRenewal {
		if subscriptionId == nil {
			return nil, errors.New("subscription required for renewal order")
		}
		sub, err := model.GetBusinessSeatSubscriptionById(*subscriptionId)
		if err != nil {
			return nil, err
		}
		if sub.UserId != userId {
			return nil, errors.New("subscription not owned by user")
		}
		if sub.WorkspaceId != quote.WorkspaceId {
			return nil, errors.New("subscription does not match quote workspace")
		}
	}

	var order *model.BusinessSeatOrder
	err = model.DB.Transaction(func(tx *gorm.DB) error {
		var txErr error
		order, txErr = s.createOrderFromQuoteInTx(tx, userId, quote, subscriptionId)
		return txErr
	})
	if err != nil {
		return nil, err
	}
	return order, nil
}

func (s *OrderService) createOrderFromQuoteInTx(tx *gorm.DB, userId int, quote *model.BusinessQuote, subscriptionId *int) (*model.BusinessSeatOrder, error) {
	if err := s.quote.MarkQuoteUsed(tx, quote.Id); err != nil {
		return nil, err
	}
	order := &model.BusinessSeatOrder{
		OrderNo:            model.GenerateBusinessSeatOrderNo(userId),
		UserId:             userId,
		ProductId:          quote.ProductId,
		WorkspaceId:        quote.WorkspaceId,
		SubscriptionId:     subscriptionId,
		PriceVersionId:     quote.PriceVersionId,
		QuoteId:            quote.Id,
		OrderType:          quote.OrderType,
		ChatgptEmail:       quote.ChatgptEmail,
		Currency:           quote.Currency,
		CurrentCycleAmount: quote.CurrentCycleAmount,
		NextCycleAmount:    quote.NextCycleAmount,
		TotalAmount:        quote.TotalAmount,
		CycleStartAt:       quote.CycleStartAt,
		CycleEndAt:         quote.CycleEndAt,
		PrepaidThrough:     quote.PrepaidThrough,
		Status:             model.BusinessOrderStatusCreated,
		PaymentStatus:      "PENDING",
		ProvisioningStatus: model.BusinessProvisioningStatusPending,
	}
	if err := tx.Create(order).Error; err != nil {
		return nil, err
	}
	items := buildOrderItemsFromQuote(quote, order.Id)
	if len(items) > 0 {
		if err := tx.Create(&items).Error; err != nil {
			return nil, err
		}
	}
	if err := model.RecordBusinessSeatAuditTx(tx, userId, "ORDER_CREATED", "order", order.Id,
		fmt.Sprintf("order_no=%s total=%s", order.OrderNo, FormatMoney(order.TotalAmount, order.Currency))); err != nil {
		return nil, err
	}
	return order, nil
}

func buildOrderItemsFromQuote(quote *model.BusinessQuote, orderId int) []model.BusinessSeatOrderItem {
	items := make([]model.BusinessSeatOrderItem, 0, 2)
	switch quote.QuoteType {
	case model.BusinessQuoteTypeCycleStartFull:
		items = append(items, model.BusinessSeatOrderItem{
			OrderId:     orderId,
			ItemType:    model.BusinessOrderItemCurrentFullCycle,
			PeriodStart: quote.CycleStartAt,
			PeriodEnd:   quote.CycleEndAt,
			Amount:      quote.CurrentCycleAmount,
			Currency:    quote.Currency,
		})
	case model.BusinessQuoteTypeMidCycleProratedPlusNext:
		if quote.CurrentCycleAmount.GreaterThan(decimal.Zero) {
			items = append(items, model.BusinessSeatOrderItem{
				OrderId:     orderId,
				ItemType:    model.BusinessOrderItemCurrentCycleProration,
				PeriodStart: quote.QuoteAt,
				PeriodEnd:   quote.CycleEndAt,
				Amount:      quote.CurrentCycleAmount,
				Currency:    quote.Currency,
			})
		}
		if quote.NextCycleAmount.GreaterThan(decimal.Zero) {
			items = append(items, model.BusinessSeatOrderItem{
				OrderId:     orderId,
				ItemType:    model.BusinessOrderItemNextCyclePrepay,
				PeriodStart: quote.NextCycleStartAt,
				PeriodEnd:   quote.NextCycleEndAt,
				Amount:      quote.NextCycleAmount,
				Currency:    quote.Currency,
			})
		}
	case model.BusinessQuoteTypeMidCycleProratedOnly:
		if quote.CurrentCycleAmount.GreaterThan(decimal.Zero) {
			items = append(items, model.BusinessSeatOrderItem{
				OrderId:     orderId,
				ItemType:    model.BusinessOrderItemCurrentCycleProration,
				PeriodStart: quote.QuoteAt,
				PeriodEnd:   quote.CycleEndAt,
				Amount:      quote.CurrentCycleAmount,
				Currency:    quote.Currency,
			})
		}
	case model.BusinessQuoteTypeRenewalFull:
		items = append(items, model.BusinessSeatOrderItem{
			OrderId:     orderId,
			ItemType:    model.BusinessOrderItemRenewalFullCycle,
			PeriodStart: quote.CycleStartAt,
			PeriodEnd:   quote.CycleEndAt,
			Amount:      quote.CurrentCycleAmount,
			Currency:    quote.Currency,
		})
	}
	return items
}
