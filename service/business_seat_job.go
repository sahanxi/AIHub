package service

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service/businessseat"

	"github.com/bytedance/gopkg/util/gopool"
)

const businessSeatJobInterval = 1 * time.Hour

var (
	businessSeatJobOnce    sync.Once
	businessSeatJobRunning atomic.Bool
)

func StartBusinessSeatBillingJob() {
	businessSeatJobOnce.Do(func() {
		if !common.IsMasterNode {
			return
		}
		gopool.Go(func() {
			logger.LogInfo(context.Background(), fmt.Sprintf("business seat billing job started: tick=%s", businessSeatJobInterval))
			ticker := time.NewTicker(businessSeatJobInterval)
			defer ticker.Stop()
			runBusinessSeatBillingOnce()
			for range ticker.C {
				runBusinessSeatBillingOnce()
			}
		})
	})
}

func runBusinessSeatBillingOnce() {
	if !businessSeatJobRunning.CompareAndSwap(false, true) {
		return
	}
	defer businessSeatJobRunning.Store(false)

	ctx := context.Background()
	now := time.Now()
	nowUnix := common.GetTimestamp()
	subSvc := businessseat.NewSubscriptionService()
	renewalSvc := businessseat.NewRenewalService()
	recon := businessseat.NewReconciliationService()

	if _, err := model.ExpireDueBusinessQuotes(nowUnix); err != nil {
		logger.LogWarn(ctx, fmt.Sprintf("business seat quote expiry failed: %v", err))
	}

	if err := renewalSvc.MarkExpiringSubscriptions(now); err != nil {
		logger.LogWarn(ctx, fmt.Sprintf("business seat expiring mark failed: %v", err))
	}

	var renewable []model.BusinessSeatSubscription
	_ = model.DB.Where("status IN ?", []string{
		model.BusinessSubscriptionStatusActive,
		model.BusinessSubscriptionStatusExpiring,
	}).Limit(500).Find(&renewable).Error
	for _, sub := range renewable {
		if sub.PrepaidThrough <= nowUnix {
			continue
		}
		ws, err := model.GetBusinessWorkspaceById(sub.WorkspaceId)
		if err != nil {
			continue
		}
		if _, err := renewalSvc.EnsureRenewalOrder(&sub, ws, now); err != nil {
			logger.LogWarn(ctx, fmt.Sprintf("business seat renewal ensure failed sub=%d: %v", sub.Id, err))
		}
	}

	var expired []model.BusinessSeatSubscription
	_ = model.DB.Where("status IN ? AND prepaid_through <= ?",
		[]string{model.BusinessSubscriptionStatusActive, model.BusinessSubscriptionStatusExpiring}, nowUnix).
		Limit(200).Find(&expired).Error
	for _, sub := range expired {
		if err := subSvc.ExpireSubscription(sub.Id); err != nil {
			logger.LogWarn(ctx, fmt.Sprintf("business seat expire failed sub=%d: %v", sub.Id, err))
		}
	}

	issues := recon.RunChecks()
	if common.DebugEnabled && len(issues) > 0 {
		logger.LogDebug(ctx, "business seat reconciliation issues=%d", len(issues))
	}
}
