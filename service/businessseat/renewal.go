package businessseat

import (
	"time"

	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

type RenewalService struct {
	billing *BillingCycleService
	quote   *QuoteService
	order   *OrderService
}

func NewRenewalService() *RenewalService {
	return &RenewalService{
		billing: NewBillingCycleService(),
		quote:   NewQuoteService(),
		order:   NewOrderService(),
	}
}

func (s *RenewalService) EnsureRenewalOrder(sub *model.BusinessSeatSubscription, ws *model.BusinessWorkspace, now time.Time) (*model.BusinessSeatOrder, error) {
	renewable := map[string]bool{
		model.BusinessSubscriptionStatusActive:   true,
		model.BusinessSubscriptionStatusExpiring: true,
	}
	if !renewable[sub.Status] {
		return nil, nil
	}

	var result *model.BusinessSeatOrder
	err := model.DB.Transaction(func(tx *gorm.DB) error {
		locked, err := model.GetBusinessSeatSubscriptionByIdForUpdate(tx, sub.Id)
		if err != nil {
			return err
		}
		if !renewable[locked.Status] {
			return nil
		}
		nowUnix := now.Unix()
		if locked.PrepaidThrough <= nowUnix {
			return nil
		}

		cycle, err := s.billing.RenewalCycleWindow(ws, locked.PrepaidThrough)
		if err != nil {
			return err
		}
		existing, err := model.FindRenewalOrderForServicePeriodTx(tx, locked.Id, cycle.Start.Unix(), cycle.End.Unix())
		if err != nil {
			return err
		}
		if existing != nil {
			result = existing
			return nil
		}

		timing, err := s.billing.RenewalTiming(ws, locked.PrepaidThrough)
		if err != nil {
			return err
		}
		if nowUnix < timing.RenewalWindowOpensAt {
			return nil
		}

		quote, err := s.quote.createRenewalQuoteInTx(tx, locked.UserId, locked, ws, now)
		if err != nil {
			return err
		}
		order, err := s.order.createOrderFromQuoteInTx(tx, locked.UserId, quote, &locked.Id)
		if err != nil {
			return err
		}
		result = order
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *RenewalService) MarkExpiringSubscriptions(now time.Time) error {
	var subs []model.BusinessSeatSubscription
	if err := model.DB.Where("status = ?", model.BusinessSubscriptionStatusActive).Find(&subs).Error; err != nil {
		return err
	}
	nowUnix := now.Unix()
	for _, sub := range subs {
		if sub.PrepaidThrough <= nowUnix {
			continue
		}
		ws, err := model.GetBusinessWorkspaceById(sub.WorkspaceId)
		if err != nil {
			continue
		}
		timing, err := s.billing.RenewalTiming(ws, sub.PrepaidThrough)
		if err != nil {
			continue
		}
		if nowUnix < timing.RenewalWindowOpensAt {
			continue
		}
		_ = model.DB.Model(&sub).Update("status", model.BusinessSubscriptionStatusExpiring).Error
	}
	return nil
}
