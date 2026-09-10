package controller

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service/businessseat"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

type businessSeatQuoteRequest struct {
	ProductId    int    `json:"product_id"`
	WorkspaceId  int    `json:"workspace_id"`
	ChatgptEmail string `json:"chatgpt_email"`
	OrderType    string `json:"order_type"`
}

type businessSeatOrderRequest struct {
	QuoteId        int  `json:"quote_id"`
	SubscriptionId *int `json:"subscription_id"`
}

type businessSeatPriceRequest struct {
	ProductId      int    `json:"product_id"`
	PriceAmount    string `json:"price_amount"`
	Currency       string `json:"currency"`
	BillingCadence string `json:"billing_cadence"`
	DisplayUnit    string `json:"display_unit"`
	EffectiveFrom  *int64 `json:"effective_from"`
}

type businessSeatWorkspaceRequest struct {
	Name                   string `json:"name"`
	Provider               string `json:"provider"`
	WorkspaceType          string `json:"workspace_type"`
	BillingCadence         string `json:"billing_cadence"`
	BillingAnchorAt        int64  `json:"billing_anchor_at"`
	BillingTimezone        string `json:"billing_timezone"`
	CycleStartGraceMinutes int    `json:"cycle_start_grace_minutes"`
	TotalStandardSeats     int    `json:"total_standard_seats"`
}

type businessSeatAddSeatsRequest struct {
	AddCount int `json:"add_count"`
}

func GetBusinessSeatCatalog(c *gin.Context) {
	product, err := model.GetBusinessProductByCode(model.BusinessProductCodeStandard)
	if err != nil {
		common.ApiSuccess(c, gin.H{
			"enabled":            setting.IsBusinessSeatSalesEnabled(),
			"product":            nil,
			"price":              nil,
			"workspace":          nil,
			"pricing_required":   true,
			"currently_available": false,
		})
		return
	}
	ws, wsErr := model.GetDefaultBusinessWorkspace()
	var price *model.BusinessPriceVersion
	if wsErr == nil {
		price, _ = model.GetEffectiveBusinessPriceVersion(product.Id, time.Now().Unix())
	}
	resp := gin.H{
		"enabled":             setting.IsBusinessSeatSalesEnabled(),
		"product":               product,
		"workspace":             ws,
		"pricing_required":      price == nil,
		"currently_available":   setting.IsBusinessSeatSalesEnabled() && price != nil && wsErr == nil,
	}
	if price != nil {
		resp["price"] = price
	}
	common.ApiSuccess(c, resp)
}

func GetBusinessSeatSelf(c *gin.Context) {
	userId := c.GetInt("id")
	sub, err := model.GetBusinessSeatSubscriptionForUser(userId)
	if err != nil {
		common.ApiSuccess(c, gin.H{"subscription": nil})
		return
	}
	ws, _ := model.GetBusinessWorkspaceById(sub.WorkspaceId)
	display := *sub
	display.ChatgptEmail = model.MaskBusinessEmail(sub.ChatgptEmail)
	common.ApiSuccess(c, gin.H{"subscription": display, "workspace": ws})
}

func CreateBusinessSeatQuote(c *gin.Context) {
	if !setting.IsBusinessSeatSalesEnabled() {
		common.ApiErrorMsg(c, "Business seat sales are currently disabled")
		return
	}
	userId := c.GetInt("id")
	var req businessSeatQuoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "Invalid request")
		return
	}
	if req.ProductId <= 0 {
		product, err := model.GetBusinessProductByCode(model.BusinessProductCodeStandard)
		if err != nil {
			common.ApiErrorMsg(c, "Product not configured")
			return
		}
		req.ProductId = product.Id
	}
	if req.WorkspaceId <= 0 {
		ws, err := model.GetDefaultBusinessWorkspace()
		if err != nil {
			common.ApiErrorMsg(c, "Workspace not configured")
			return
		}
		req.WorkspaceId = ws.Id
	}
	if req.OrderType == "" {
		req.OrderType = model.BusinessOrderTypeNew
	}

	quoteSvc := businessseat.NewQuoteService()
	var quote *model.BusinessQuote
	var err error
	switch req.OrderType {
	case model.BusinessOrderTypeRenewal:
		sub, subErr := model.GetCurrentBusinessSeatSubscriptionByUserId(userId)
		if subErr != nil {
			common.ApiErrorMsg(c, "No subscription to renew")
			return
		}
		quote, err = quoteSvc.CreateRenewalQuote(userId, sub.Id)
	case model.BusinessOrderTypeReactivation:
		subSvc := businessseat.NewSubscriptionService()
		quote, err = subSvc.CreateReactivationQuote(userId, req.ChatgptEmail)
	default:
		if open, subErr := model.HasOpenBusinessSeatSubscription(userId); subErr == nil && open {
			common.ApiErrorMsg(c, "You already have an active business seat subscription")
			return
		}
		quote, err = quoteSvc.CreateQuote(businessseat.QuoteInput{
			UserId:       userId,
			ProductId:    req.ProductId,
			WorkspaceId:  req.WorkspaceId,
			ChatgptEmail: req.ChatgptEmail,
			OrderType:    model.BusinessOrderTypeNew,
		})
	}
	if err != nil {
		if errors.Is(err, model.ErrBusinessPricingNotConfigured) {
			common.ApiErrorMsg(c, "Pricing configuration required")
			return
		}
		common.ApiErrorMsg(c, err.Error())
		return
	}
	common.ApiSuccess(c, quote)
}

func CreateBusinessSeatOrder(c *gin.Context) {
	if !setting.IsBusinessSeatSalesEnabled() {
		common.ApiErrorMsg(c, "Business seat sales are currently disabled")
		return
	}
	userId := c.GetInt("id")
	var req businessSeatOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.QuoteId <= 0 {
		common.ApiErrorMsg(c, "Invalid request")
		return
	}
	subscriptionId := req.SubscriptionId
	if subscriptionId == nil {
		quote, qErr := model.GetBusinessQuoteById(req.QuoteId)
		if qErr == nil && quote.OrderType == model.BusinessOrderTypeRenewal {
			sub, subErr := model.GetCurrentBusinessSeatSubscriptionByUserId(userId)
			if subErr == nil {
				subscriptionId = &sub.Id
			}
		}
	}
	orderSvc := businessseat.NewOrderService()
	order, err := orderSvc.CreateOrderFromQuote(userId, req.QuoteId, subscriptionId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	common.ApiSuccess(c, order)
}

func AdminBusinessSeatOverview(c *gin.Context) {
	wsList, _ := model.ListBusinessWorkspaces()
	var activeCount int64
	_ = model.DB.Model(&model.BusinessSeatSubscription{}).Where("status = ?", model.BusinessSubscriptionStatusActive).Count(&activeCount).Error
	stats := gin.H{}
	if len(wsList) > 0 {
		pool, _ := model.GetBusinessSeatPoolStats(wsList[0].Id)
		stats = gin.H{
			"total_seats":     pool.Total,
			"available_seats": pool.Available,
			"active_seats":    pool.Active,
		}
	}
	var pendingCapacity, pendingActivation, pendingRemoval int64
	_ = model.DB.Model(&model.BusinessSeatSubscription{}).Where("status = ?", model.BusinessSubscriptionStatusPendingCapacity).Count(&pendingCapacity).Error
	_ = model.DB.Model(&model.BusinessSeatSubscription{}).Where("status IN ?", []string{model.BusinessSubscriptionStatusPendingActivation, model.BusinessSubscriptionStatusInvited}).Count(&pendingActivation).Error
	_ = model.DB.Model(&model.BusinessSeatSubscription{}).Where("status = ?", model.BusinessSubscriptionStatusPendingRemoval).Count(&pendingRemoval).Error

	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Unix()
	revenue, _ := model.SumPaidBusinessSeatOrderAmountSince(monthStart)

	common.ApiSuccess(c, gin.H{
		"active_users":       activeCount,
		"pending_capacity":   pendingCapacity,
		"pending_activation": pendingActivation,
		"pending_removal":    pendingRemoval,
		"cash_collected":     revenue,
		"pool":               stats,
	})
}

func AdminListBusinessWorkspaces(c *gin.Context) {
	list, err := model.ListBusinessWorkspaces()
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	type workspaceRow struct {
		model.BusinessWorkspace
		Pool   model.BusinessSeatPoolStats `json:"pool"`
		Active int64                       `json:"active_subscriptions"`
	}
	rows := make([]workspaceRow, 0, len(list))
	for _, ws := range list {
		pool, _ := model.GetBusinessSeatPoolStats(ws.Id)
		var activeCount int64
		_ = model.DB.Model(&model.BusinessSeatSubscription{}).
			Where("workspace_id = ? AND status IN ?", ws.Id, []string{
				model.BusinessSubscriptionStatusPendingActivation,
				model.BusinessSubscriptionStatusInvited,
				model.BusinessSubscriptionStatusActive,
				model.BusinessSubscriptionStatusExpiring,
				model.BusinessSubscriptionStatusPendingRemoval,
			}).Count(&activeCount).Error
		rows = append(rows, workspaceRow{BusinessWorkspace: ws, Pool: pool, Active: activeCount})
	}
	common.ApiSuccess(c, rows)
}

func AdminCreateBusinessWorkspace(c *gin.Context) {
	var req businessSeatWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "Invalid request")
		return
	}
	if strings.TrimSpace(req.Name) == "" || req.BillingAnchorAt <= 0 {
		common.ApiErrorMsg(c, "Name and billing anchor required")
		return
	}
	if req.Provider == "" {
		req.Provider = model.BusinessWorkspaceProviderOpenAI
	}
	if req.WorkspaceType == "" {
		req.WorkspaceType = model.BusinessWorkspaceTypeChatGPTBusiness
	}
	if req.BillingCadence == "" {
		req.BillingCadence = model.BusinessBillingCadenceMonthly
	}
	if req.BillingTimezone == "" {
		req.BillingTimezone = "Asia/Shanghai"
	}
	if req.CycleStartGraceMinutes <= 0 {
		req.CycleStartGraceMinutes = setting.BusinessSeatDefaultGraceMinutesValue()
	}
	ws := model.BusinessWorkspace{
		Name:                   req.Name,
		Provider:               req.Provider,
		WorkspaceType:          req.WorkspaceType,
		Status:                 model.BusinessWorkspaceStatusActive,
		BillingCadence:         req.BillingCadence,
		BillingAnchorAt:        req.BillingAnchorAt,
		BillingTimezone:        req.BillingTimezone,
		CycleStartGraceMinutes: req.CycleStartGraceMinutes,
		TotalStandardSeats:     req.TotalStandardSeats,
	}
	if err := model.CreateBusinessWorkspace(&ws); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	model.RecordBusinessSeatAudit(c.GetInt("id"), "WORKSPACE_BILLING_CHANGED", "workspace", ws.Id, ws.Name)
	common.ApiSuccess(c, ws)
}

func AdminAddBusinessSeats(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req businessSeatAddSeatsRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.AddCount <= 0 {
		common.ApiErrorMsg(c, "Invalid request")
		return
	}
	if err := model.AddBusinessSeatsToWorkspace(id, req.AddCount); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	model.RecordBusinessSeatAudit(c.GetInt("id"), "WORKSPACE_SEAT_COUNT_CHANGED", "workspace", id, strconv.Itoa(req.AddCount))
	common.ApiSuccess(c, gin.H{"success": true})
}

func AdminUpdateBusinessWorkspace(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	ws, err := model.GetBusinessWorkspaceById(id)
	if err != nil {
		common.ApiErrorMsg(c, "Workspace not found")
		return
	}
	var req businessSeatWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "Invalid request")
		return
	}
	activeCount, _ := model.CountActiveBusinessSubscriptionsByWorkspace(id)
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.BillingTimezone != "" {
		updates["billing_timezone"] = req.BillingTimezone
	}
	if req.CycleStartGraceMinutes > 0 {
		updates["cycle_start_grace_minutes"] = req.CycleStartGraceMinutes
	}
	if req.BillingAnchorAt > 0 {
		if activeCount > 0 && req.BillingAnchorAt != ws.BillingAnchorAt {
			common.ApiErrorMsg(c, "Billing anchor locked while active subscriptions exist")
			return
		}
		updates["billing_anchor_at"] = req.BillingAnchorAt
	}
	if len(updates) == 0 {
		common.ApiSuccess(c, ws)
		return
	}
	if err := model.DB.Model(ws).Updates(updates).Error; err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	model.RecordBusinessSeatAudit(c.GetInt("id"), "WORKSPACE_BILLING_CHANGED", "workspace", id, "")
	common.ApiSuccess(c, ws)
}

func AdminListBusinessPriceVersions(c *gin.Context) {
	productId, _ := strconv.Atoi(c.Query("product_id"))
	if productId <= 0 {
		product, err := model.GetBusinessProductByCode(model.BusinessProductCodeStandard)
		if err != nil {
			common.ApiErrorMsg(c, "Product not found")
			return
		}
		productId = product.Id
	}
	list, err := model.ListBusinessPriceVersions(productId)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	current, _ := model.GetEffectiveBusinessPriceVersion(productId, time.Now().Unix())
	common.ApiSuccess(c, gin.H{"versions": list, "current": current})
}

func AdminCreateBusinessPriceVersion(c *gin.Context) {
	var req businessSeatPriceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "Invalid request")
		return
	}
	if req.ProductId <= 0 {
		product, err := model.GetBusinessProductByCode(model.BusinessProductCodeStandard)
		if err != nil {
			common.ApiErrorMsg(c, "Product not found")
			return
		}
		req.ProductId = product.Id
	}
	amount, err := decimal.NewFromString(strings.TrimSpace(req.PriceAmount))
	if err != nil || !amount.GreaterThan(decimal.Zero) {
		common.ApiErrorMsg(c, "Invalid price amount")
		return
	}
	if req.Currency == "" || req.BillingCadence == "" {
		common.ApiErrorMsg(c, "Currency and billing cadence required")
		return
	}
	pv := model.BusinessPriceVersion{
		ProductId:      req.ProductId,
		PriceAmount:    amount,
		Currency:       strings.ToUpper(req.Currency),
		BillingCadence: req.BillingCadence,
		DisplayUnit:    req.DisplayUnit,
		CreatedBy:      c.GetInt("id"),
	}
	if req.EffectiveFrom != nil {
		pv.EffectiveFrom = *req.EffectiveFrom
	}
	if err := model.CreateBusinessPriceVersion(&pv); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	model.RecordBusinessSeatAudit(c.GetInt("id"), "PRICE_VERSION_CREATED", "price_version", pv.Id, businessseat.FormatMoney(amount, pv.Currency))
	common.ApiSuccess(c, pv)
}

func AdminListBusinessSubscriptions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}
	filter := map[string]interface{}{}
	if status := c.Query("status"); status != "" {
		filter["status"] = status
	}
	list, total, err := model.ListBusinessSeatSubscriptions(filter, size, (page-1)*size)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	common.ApiSuccess(c, gin.H{"items": list, "total": total})
}

func AdminListBusinessOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}
	list, total, err := model.ListBusinessSeatOrders(size, (page-1)*size)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	common.ApiSuccess(c, gin.H{"items": list, "total": total})
}

func AdminGetBusinessOrder(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	order, err := model.GetBusinessSeatOrderById(id)
	if err != nil {
		common.ApiErrorMsg(c, "Order not found")
		return
	}
	items, _ := model.ListBusinessSeatOrderItems(id)
	common.ApiSuccess(c, gin.H{"order": order, "items": items})
}

func AdminListBusinessSeats(c *gin.Context) {
	workspaceId, _ := strconv.Atoi(c.Query("workspace_id"))
	if workspaceId <= 0 {
		ws, err := model.GetDefaultBusinessWorkspace()
		if err != nil {
			common.ApiErrorMsg(c, "Workspace not found")
			return
		}
		workspaceId = ws.Id
	}
	var seats []model.BusinessSeat
	if err := model.DB.Where("workspace_id = ?", workspaceId).Order("seat_number asc").Find(&seats).Error; err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	stats, _ := model.GetBusinessSeatPoolStats(workspaceId)
	common.ApiSuccess(c, gin.H{"seats": seats, "stats": stats})
}

func AdminListBusinessTasks(c *gin.Context) {
	tasks, err := model.ListOpenBusinessSeatTasks(c.Query("type"), 200)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	type taskRow struct {
		model.BusinessSeatTask
		ChatgptEmail string `json:"chatgpt_email"`
		WorkspaceName string `json:"workspace_name"`
		SeatNumber   int    `json:"seat_number"`
	}
	rows := make([]taskRow, 0, len(tasks))
	for _, task := range tasks {
		row := taskRow{BusinessSeatTask: task}
		if task.SubscriptionId != nil {
			if sub, err := model.GetBusinessSeatSubscriptionById(*task.SubscriptionId); err == nil {
				row.ChatgptEmail = sub.ChatgptEmail
			}
		}
		if ws, err := model.GetBusinessWorkspaceById(task.WorkspaceId); err == nil {
			row.WorkspaceName = ws.Name
		}
		if task.SeatId != nil {
			var seat model.BusinessSeat
			if err := model.DB.First(&seat, *task.SeatId).Error; err == nil {
				row.SeatNumber = seat.SeatNumber
			}
		}
		rows = append(rows, row)
	}
	common.ApiSuccess(c, rows)
}

func AdminDisableBusinessSeat(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var seat model.BusinessSeat
	if err := model.DB.First(&seat, id).Error; err != nil {
		common.ApiErrorMsg(c, "Seat not found")
		return
	}
	if seat.Status != model.BusinessSeatStatusAvailable {
		common.ApiErrorMsg(c, "Only available seats can be disabled")
		return
	}
	if err := model.DB.Model(&seat).Update("status", model.BusinessSeatStatusDisabled).Error; err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	model.RecordBusinessSeatAudit(c.GetInt("id"), "SEAT_DISABLED", "seat", seat.Id, "")
	common.ApiSuccess(c, gin.H{"success": true})
}

func AdminMarkBusinessInvited(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := businessseat.NewSubscriptionService().MarkInvited(c.GetInt("id"), id); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	common.ApiSuccess(c, gin.H{"success": true})
}

func AdminActivateBusinessSubscription(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := businessseat.NewSubscriptionService().Activate(c.GetInt("id"), id); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	common.ApiSuccess(c, gin.H{"success": true})
}

func AdminConfirmBusinessSeatAdded(c *gin.Context) {
	subId, _ := strconv.Atoi(c.Param("id"))
	sub, err := model.GetBusinessSeatSubscriptionById(subId)
	if err != nil {
		common.ApiErrorMsg(c, "Subscription not found")
		return
	}
	if err := businessseat.NewProvisioningService().ConfirmSeatAdded(c.GetInt("id"), sub.WorkspaceId, sub.Id); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	common.ApiSuccess(c, gin.H{"success": true})
}

func AdminConfirmBusinessRemoved(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := businessseat.NewSubscriptionService().ConfirmRemoved(c.GetInt("id"), id); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	common.ApiSuccess(c, gin.H{"success": true})
}

func AdminListBusinessAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "50"))
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 200 {
		size = 50
	}
	list, total, err := model.ListBusinessSeatAuditLogs(size, (page-1)*size)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	common.ApiSuccess(c, gin.H{"items": list, "total": total})
}

func AdminBusinessReconciliation(c *gin.Context) {
	issues := businessseat.NewReconciliationService().RunChecks()
	common.ApiSuccess(c, gin.H{"issues": issues})
}
