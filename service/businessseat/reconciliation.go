package businessseat

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/model"
)

type ReconciliationIssue struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ReconciliationService struct{}

func NewReconciliationService() *ReconciliationService {
	return &ReconciliationService{}
}

func (s *ReconciliationService) RunChecks() []ReconciliationIssue {
	issues := make([]ReconciliationIssue, 0)

	var paidNoSub []model.BusinessSeatOrder
	_ = model.DB.Where("status = ? AND subscription_id IS NULL", model.BusinessOrderStatusPaid).Find(&paidNoSub).Error
	for _, o := range paidNoSub {
		issues = append(issues, ReconciliationIssue{
			Code:    "PAID_ORDER_NO_SUBSCRIPTION",
			Message: fmt.Sprintf("order %s paid without subscription", o.OrderNo),
		})
	}

	var pendingCap []model.BusinessSeatSubscription
	_ = model.DB.Where("status = ?", model.BusinessSubscriptionStatusPendingCapacity).Find(&pendingCap).Error
	for _, sub := range pendingCap {
		task, _ := model.FindOpenBusinessSeatTask(model.BusinessTaskTypeAddSeat, sub.Id)
		if task == nil {
			issues = append(issues, ReconciliationIssue{
				Code:    "PENDING_CAPACITY_NO_TASK",
				Message: fmt.Sprintf("subscription %d pending capacity without ADD_SEAT task", sub.Id),
			})
		}
	}

	var activeSubs []model.BusinessSeatSubscription
	_ = model.DB.Where("status = ? AND seat_id IS NOT NULL", model.BusinessSubscriptionStatusActive).Find(&activeSubs).Error
	for _, sub := range activeSubs {
		if sub.SeatId == nil {
			continue
		}
		var seat model.BusinessSeat
		if err := model.DB.First(&seat, *sub.SeatId).Error; err != nil {
			continue
		}
		if seat.Status != model.BusinessSeatStatusActive {
			issues = append(issues, ReconciliationIssue{
				Code:    "ACTIVE_SUBSCRIPTION_SEAT_MISMATCH",
				Message: fmt.Sprintf("subscription %d active but seat %d not active", sub.Id, seat.Id),
			})
		}
	}

	if len(issues) == 0 {
		return issues
	}
	detail := strings.Join(func() []string {
		out := make([]string, len(issues))
		for i, issue := range issues {
			out[i] = issue.Code + ": " + issue.Message
		}
		return out
	}(), "; ")
	model.RecordBusinessSeatAudit(0, "CONSISTENCY_CHECK", "system", 0, detail)
	return issues
}
