package model

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// Billing cadence
const (
	BusinessBillingCadenceMonthly = "MONTHLY"
	BusinessBillingCadenceAnnual  = "ANNUAL"
)

// Workspace
const (
	BusinessWorkspaceProviderOpenAI         = "OPENAI"
	BusinessWorkspaceTypeChatGPTBusiness    = "CHATGPT_BUSINESS"
	BusinessWorkspaceStatusActive           = "ACTIVE"
	BusinessWorkspaceStatusDisabled         = "DISABLED"
)

// Product
const (
	BusinessProductCodeStandard = "BUSINESS_STANDARD"
)

// Quote types
const (
	BusinessQuoteTypeCycleStartFull            = "CYCLE_START_FULL"
	BusinessQuoteTypeMidCycleProratedPlusNext  = "MID_CYCLE_PRORATED_PLUS_NEXT"
	BusinessQuoteTypeRenewalFull               = "RENEWAL_FULL"
)

// Quote status
const (
	BusinessQuoteStatusPending  = "PENDING"
	BusinessQuoteStatusUsed     = "USED"
	BusinessQuoteStatusExpired  = "EXPIRED"
	BusinessQuoteStatusCancelled = "CANCELLED"
)

// Order types
const (
	BusinessOrderTypeNew           = "NEW"
	BusinessOrderTypeRenewal       = "RENEWAL"
	BusinessOrderTypeReactivation  = "REACTIVATION"
)

// Order status (V1: no refund states used)
const (
	BusinessOrderStatusCreated   = "CREATED"
	BusinessOrderStatusPaying    = "PAYING"
	BusinessOrderStatusPaid      = "PAID"
	BusinessOrderStatusCancelled = "CANCELLED"
	BusinessOrderStatusFailed    = "FAILED"
)

// Order line item types
const (
	BusinessOrderItemCurrentCycleProration = "CURRENT_CYCLE_PRORATION"
	BusinessOrderItemCurrentFullCycle      = "CURRENT_FULL_CYCLE"
	BusinessOrderItemNextCyclePrepay       = "NEXT_CYCLE_PREPAY"
	BusinessOrderItemRenewalFullCycle      = "RENEWAL_FULL_CYCLE"
)

// Subscription status
const (
	BusinessSubscriptionStatusPendingPayment    = "PENDING_PAYMENT"
	BusinessSubscriptionStatusPendingCapacity   = "PENDING_CAPACITY"
	BusinessSubscriptionStatusPendingActivation = "PENDING_ACTIVATION"
	BusinessSubscriptionStatusInvited           = "INVITED"
	BusinessSubscriptionStatusActive            = "ACTIVE"
	BusinessSubscriptionStatusExpiring          = "EXPIRING"
	BusinessSubscriptionStatusExpired           = "EXPIRED"
	BusinessSubscriptionStatusPendingRemoval    = "PENDING_REMOVAL"
	BusinessSubscriptionStatusRemoved           = "REMOVED"
	BusinessSubscriptionStatusReactivationReq   = "REACTIVATION_REQUIRED"
	BusinessSubscriptionStatusCancelled         = "CANCELLED"
)

// Seat status
const (
	BusinessSeatStatusAvailable      = "AVAILABLE"
	BusinessSeatStatusReserved       = "RESERVED"
	BusinessSeatStatusInvited        = "INVITED"
	BusinessSeatStatusActive         = "ACTIVE"
	BusinessSeatStatusPendingRelease = "PENDING_RELEASE"
	BusinessSeatStatusDisabled       = "DISABLED"
)

// Seat type
const (
	BusinessSeatTypeStandard = "STANDARD"
)

// Admin task types
const (
	BusinessTaskTypeAddSeat              = "ADD_SEAT"
	BusinessTaskTypeInviteMember         = "INVITE_MEMBER"
	BusinessTaskTypeConfirmActivation    = "CONFIRM_ACTIVATION"
	BusinessTaskTypeRemoveMember         = "REMOVE_MEMBER"
	BusinessTaskTypeVerifyReactivation   = "VERIFY_REACTIVATION"
)

// Admin task status
const (
	BusinessTaskStatusOpen       = "OPEN"
	BusinessTaskStatusInProgress = "IN_PROGRESS"
	BusinessTaskStatusDone       = "DONE"
	BusinessTaskStatusCancelled  = "CANCELLED"
)

// Provisioning status on orders
const (
	BusinessProvisioningStatusPending    = "PENDING"
	BusinessProvisioningStatusProcessing = "PROCESSING"
	BusinessProvisioningStatusCompleted  = "COMPLETED"
	BusinessProvisioningStatusFailed     = "FAILED"
)

var (
	ErrBusinessWorkspaceNotFound      = errors.New("business workspace not found")
	ErrBusinessProductNotFound        = errors.New("business product not found")
	ErrBusinessPriceVersionNotFound   = errors.New("business price version not found")
	ErrBusinessQuoteNotFound          = errors.New("business quote not found")
	ErrBusinessQuoteExpired           = errors.New("business quote expired")
	ErrBusinessOrderNotFound          = errors.New("business seat order not found")
	ErrBusinessSubscriptionNotFound   = errors.New("business seat subscription not found")
	ErrBusinessSeatNotFound           = errors.New("business seat not found")
	ErrBusinessNoAvailableSeat        = errors.New("no available business seat")
	ErrBusinessPricingNotConfigured   = errors.New("business seat pricing not configured")
	ErrBusinessBillingCadenceMismatch = errors.New("product billing cadence does not match workspace")
)

type BusinessWorkspace struct {
	Id                     int    `json:"id"`
	Name                   string `json:"name" gorm:"type:varchar(128);not null"`
	Provider               string `json:"provider" gorm:"type:varchar(32);not null;default:OPENAI"`
	WorkspaceType          string `json:"workspace_type" gorm:"type:varchar(64);not null;default:CHATGPT_BUSINESS"`
	Status                 string `json:"status" gorm:"type:varchar(32);not null;default:ACTIVE;index"`
	BillingCadence         string `json:"billing_cadence" gorm:"type:varchar(16);not null;default:MONTHLY"`
	BillingAnchorAt        int64  `json:"billing_anchor_at" gorm:"type:bigint;not null"`
	BillingTimezone        string `json:"billing_timezone" gorm:"type:varchar(64);not null;default:UTC"`
	CycleStartGraceMinutes int    `json:"cycle_start_grace_minutes" gorm:"not null;default:60"`
	TotalStandardSeats     int    `json:"total_standard_seats" gorm:"not null;default:0"`
	CreatedAt              int64  `json:"created_at" gorm:"type:bigint;autoCreateTime"`
	UpdatedAt              int64  `json:"updated_at" gorm:"type:bigint;autoUpdateTime"`
}

type BusinessProduct struct {
	Id        int    `json:"id"`
	Code      string `json:"code" gorm:"type:varchar(64);uniqueIndex;not null"`
	Name      string `json:"name" gorm:"type:varchar(128);not null"`
	Provider  string `json:"provider" gorm:"type:varchar(32);not null;default:OPENAI"`
	Enabled   bool   `json:"enabled" gorm:"not null;default:true"`
	CreatedAt int64  `json:"created_at" gorm:"type:bigint;autoCreateTime"`
	UpdatedAt int64  `json:"updated_at" gorm:"type:bigint;autoUpdateTime"`
}

type BusinessPriceVersion struct {
	Id             int             `json:"id"`
	ProductId      int             `json:"product_id" gorm:"index;not null"`
	PriceAmount    decimal.Decimal `json:"price_amount" gorm:"type:decimal(20,6);not null"`
	Currency       string          `json:"currency" gorm:"type:varchar(8);not null"`
	BillingCadence string          `json:"billing_cadence" gorm:"type:varchar(16);not null"`
	DisplayUnit    string          `json:"display_unit" gorm:"type:varchar(32);not null;default:''"`
	EffectiveFrom  int64           `json:"effective_from" gorm:"type:bigint;not null;index"`
	EffectiveTo    *int64          `json:"effective_to" gorm:"type:bigint;index"`
	Enabled        bool            `json:"enabled" gorm:"not null;default:true"`
	CreatedBy      int             `json:"created_by" gorm:"not null;default:0"`
	CreatedAt      int64           `json:"created_at" gorm:"type:bigint;autoCreateTime"`
}

type BusinessQuote struct {
	Id                 int             `json:"id"`
	UserId             int             `json:"user_id" gorm:"index;not null"`
	WorkspaceId        int             `json:"workspace_id" gorm:"index;not null"`
	ProductId          int             `json:"product_id" gorm:"index;not null"`
	PriceVersionId     int             `json:"price_version_id" gorm:"not null"`
	ChatgptEmail       string          `json:"chatgpt_email" gorm:"type:varchar(255);not null"`
	QuoteType          string          `json:"quote_type" gorm:"type:varchar(64);not null"`
	QuoteAt            int64           `json:"quote_at" gorm:"type:bigint;not null"`
	ExpiresAt          int64           `json:"expires_at" gorm:"type:bigint;not null;index"`
	CycleStartAt       int64           `json:"cycle_start_at" gorm:"type:bigint;not null"`
	CycleEndAt         int64           `json:"cycle_end_at" gorm:"type:bigint;not null"`
	NextCycleStartAt   int64           `json:"next_cycle_start_at" gorm:"type:bigint;not null"`
	NextCycleEndAt     int64           `json:"next_cycle_end_at" gorm:"type:bigint;not null"`
	ProrationRatio     decimal.Decimal `json:"proration_ratio" gorm:"type:decimal(20,10);not null;default:0"`
	CurrentCycleAmount decimal.Decimal `json:"current_cycle_amount" gorm:"type:decimal(20,6);not null"`
	NextCycleAmount    decimal.Decimal `json:"next_cycle_amount" gorm:"type:decimal(20,6);not null;default:0"`
	TotalAmount        decimal.Decimal `json:"total_amount" gorm:"type:decimal(20,6);not null"`
	Currency           string          `json:"currency" gorm:"type:varchar(8);not null"`
	PrepaidThrough     int64           `json:"prepaid_through" gorm:"type:bigint;not null"`
	OrderType          string          `json:"order_type" gorm:"type:varchar(32);not null"`
	Status             string          `json:"status" gorm:"type:varchar(32);not null;default:PENDING;index"`
	CreatedAt          int64           `json:"created_at" gorm:"type:bigint;autoCreateTime"`
}

type BusinessSeatOrder struct {
	Id                  int             `json:"id"`
	OrderNo             string          `json:"order_no" gorm:"type:varchar(64);uniqueIndex;not null"`
	UserId              int             `json:"user_id" gorm:"index;not null"`
	ProductId           int             `json:"product_id" gorm:"index;not null"`
	WorkspaceId         int             `json:"workspace_id" gorm:"index;not null"`
	SubscriptionId      *int            `json:"subscription_id" gorm:"index"`
	PriceVersionId      int             `json:"price_version_id" gorm:"not null"`
	QuoteId             int             `json:"quote_id" gorm:"index;not null"`
	OrderType           string          `json:"order_type" gorm:"type:varchar(32);not null"`
	ChatgptEmail        string          `json:"chatgpt_email" gorm:"type:varchar(255);not null"`
	Currency            string          `json:"currency" gorm:"type:varchar(8);not null"`
	CurrentCycleAmount  decimal.Decimal `json:"current_cycle_amount" gorm:"type:decimal(20,6);not null"`
	NextCycleAmount     decimal.Decimal `json:"next_cycle_amount" gorm:"type:decimal(20,6);not null;default:0"`
	TotalAmount         decimal.Decimal `json:"total_amount" gorm:"type:decimal(20,6);not null"`
	CycleStartAt        int64           `json:"cycle_start_at" gorm:"type:bigint;not null"`
	CycleEndAt          int64           `json:"cycle_end_at" gorm:"type:bigint;not null"`
	PrepaidThrough      int64           `json:"prepaid_through" gorm:"type:bigint;not null;index"`
	Status              string          `json:"status" gorm:"type:varchar(32);not null;default:CREATED;index"`
	PaymentStatus       string          `json:"payment_status" gorm:"type:varchar(32);not null;default:PENDING"`
	ProvisioningStatus  string          `json:"provisioning_status" gorm:"type:varchar(32);not null;default:PENDING"`
	PaymentChannel      string          `json:"payment_channel" gorm:"type:varchar(32);default:''"`
	PaymentOrderNo      string          `json:"payment_order_no" gorm:"type:varchar(128);default:'';index"`
	ProviderTradeNo     *string         `json:"provider_trade_no" gorm:"type:varchar(128);uniqueIndex"`
	PaidAt              *int64          `json:"paid_at" gorm:"type:bigint"`
	CreatedAt           int64           `json:"created_at" gorm:"type:bigint;autoCreateTime"`
	UpdatedAt           int64           `json:"updated_at" gorm:"type:bigint;autoUpdateTime"`
}

type BusinessSeatOrderItem struct {
	Id          int             `json:"id"`
	OrderId     int             `json:"order_id" gorm:"index;not null"`
	ItemType    string          `json:"item_type" gorm:"type:varchar(64);not null"`
	Description string          `json:"description" gorm:"type:varchar(255);default:''"`
	PeriodStart int64           `json:"period_start" gorm:"type:bigint;not null"`
	PeriodEnd   int64           `json:"period_end" gorm:"type:bigint;not null"`
	Amount      decimal.Decimal `json:"amount" gorm:"type:decimal(20,6);not null"`
	Currency    string          `json:"currency" gorm:"type:varchar(8);not null"`
	CreatedAt   int64           `json:"created_at" gorm:"type:bigint;autoCreateTime"`
}

type BusinessSeatSubscription struct {
	Id                   int    `json:"id"`
	UserId               int    `json:"user_id" gorm:"index;not null"`
	ProductId            int    `json:"product_id" gorm:"index;not null"`
	WorkspaceId          int    `json:"workspace_id" gorm:"index;not null"`
	SeatId               *int   `json:"seat_id" gorm:"index"`
	ChatgptEmail         string `json:"chatgpt_email" gorm:"type:varchar(255);not null;index"`
	Status               string `json:"status" gorm:"type:varchar(32);not null;index"`
	ActivatedAt          *int64 `json:"activated_at" gorm:"type:bigint"`
	AccessStartAt        *int64 `json:"access_start_at" gorm:"type:bigint"`
	PrepaidThrough       int64  `json:"prepaid_through" gorm:"type:bigint;not null;index"`
	CurrentPriceVersionId int   `json:"current_price_version_id" gorm:"not null"`
	LastOrderId          *int   `json:"last_order_id" gorm:"index"`
	InvitedAt            *int64 `json:"invited_at" gorm:"type:bigint"`
	ExpiredAt            *int64 `json:"expired_at" gorm:"type:bigint"`
	RemovedAt            *int64 `json:"removed_at" gorm:"type:bigint"`
	CreatedAt            int64  `json:"created_at" gorm:"type:bigint;autoCreateTime"`
	UpdatedAt            int64  `json:"updated_at" gorm:"type:bigint;autoUpdateTime"`
}

type BusinessSeat struct {
	Id              int    `json:"id"`
	WorkspaceId     int    `json:"workspace_id" gorm:"index:idx_business_seat_workspace_number,priority:1;not null"`
	SeatType        string `json:"seat_type" gorm:"type:varchar(32);not null;default:STANDARD"`
	SeatNumber      int    `json:"seat_number" gorm:"index:idx_business_seat_workspace_number,priority:2;not null"`
	Status          string `json:"status" gorm:"type:varchar(32);not null;index"`
	SubscriptionId  *int   `json:"subscription_id" gorm:"index"`
	UserId          *int   `json:"user_id" gorm:"index"`
	AssignedEmail   string `json:"assigned_email" gorm:"type:varchar(255);default:''"`
	ReservedAt      *int64 `json:"reserved_at" gorm:"type:bigint"`
	InvitedAt       *int64 `json:"invited_at" gorm:"type:bigint"`
	ActivatedAt     *int64 `json:"activated_at" gorm:"type:bigint"`
	ReleasedAt      *int64 `json:"released_at" gorm:"type:bigint"`
	CreatedAt       int64  `json:"created_at" gorm:"type:bigint;autoCreateTime"`
	UpdatedAt       int64  `json:"updated_at" gorm:"type:bigint;autoUpdateTime"`
}

type BusinessSeatTask struct {
	Id             int    `json:"id"`
	TaskType       string `json:"task_type" gorm:"type:varchar(64);not null;index"`
	Status         string `json:"status" gorm:"type:varchar(32);not null;default:OPEN;index"`
	WorkspaceId    int    `json:"workspace_id" gorm:"index;not null"`
	SubscriptionId *int   `json:"subscription_id" gorm:"index"`
	SeatId         *int   `json:"seat_id" gorm:"index"`
	UserId         *int   `json:"user_id" gorm:"index"`
	Payload        string `json:"payload" gorm:"type:text;default:''"`
	CompletedAt    *int64 `json:"completed_at" gorm:"type:bigint"`
	CreatedAt      int64  `json:"created_at" gorm:"type:bigint;autoCreateTime"`
	UpdatedAt      int64  `json:"updated_at" gorm:"type:bigint;autoUpdateTime"`
}

type BusinessSeatAuditLog struct {
	Id         int    `json:"id"`
	ActorId    int    `json:"actor_id" gorm:"index;not null;default:0"`
	Action     string `json:"action" gorm:"type:varchar(64);not null;index"`
	EntityType string `json:"entity_type" gorm:"type:varchar(64);not null"`
	EntityId   int    `json:"entity_id" gorm:"index;not null"`
	Detail     string `json:"detail" gorm:"type:text;default:''"`
	CreatedAt  int64  `json:"created_at" gorm:"type:bigint;autoCreateTime;index"`
}

type BusinessSeatPoolStats struct {
	Total          int `json:"total"`
	Available      int `json:"available"`
	Reserved       int `json:"reserved"`
	Invited        int `json:"invited"`
	Active         int `json:"active"`
	PendingRelease int `json:"pending_release"`
	Disabled       int `json:"disabled"`
}

func normalizeBusinessEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func RecordBusinessSeatAudit(actorId int, action, entityType string, entityId int, detail string) {
	_ = recordBusinessSeatAuditDB(DB, actorId, action, entityType, entityId, detail)
}

func RecordBusinessSeatAuditTx(tx *gorm.DB, actorId int, action, entityType string, entityId int, detail string) error {
	if tx == nil {
		tx = DB
	}
	return recordBusinessSeatAuditDB(tx, actorId, action, entityType, entityId, detail)
}

func recordBusinessSeatAuditDB(db *gorm.DB, actorId int, action, entityType string, entityId int, detail string) error {
	entry := BusinessSeatAuditLog{
		ActorId:    actorId,
		Action:     action,
		EntityType: entityType,
		EntityId:   entityId,
		Detail:     detail,
		CreatedAt:  common.GetTimestamp(),
	}
	return db.Create(&entry).Error
}

func GetBusinessWorkspaceById(id int) (*BusinessWorkspace, error) {
	if id <= 0 {
		return nil, ErrBusinessWorkspaceNotFound
	}
	var ws BusinessWorkspace
	if err := DB.First(&ws, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessWorkspaceNotFound
		}
		return nil, err
	}
	return &ws, nil
}

func GetDefaultBusinessWorkspace() (*BusinessWorkspace, error) {
	var ws BusinessWorkspace
	err := DB.Where("status = ?", BusinessWorkspaceStatusActive).Order("id asc").First(&ws).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessWorkspaceNotFound
		}
		return nil, err
	}
	return &ws, nil
}

func ListBusinessWorkspaces() ([]BusinessWorkspace, error) {
	var list []BusinessWorkspace
	err := DB.Order("id asc").Find(&list).Error
	return list, err
}

func CreateBusinessWorkspace(ws *BusinessWorkspace) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(ws).Error; err != nil {
			return err
		}
		for i := 1; i <= ws.TotalStandardSeats; i++ {
			seat := BusinessSeat{
				WorkspaceId: ws.Id,
				SeatType:    BusinessSeatTypeStandard,
				SeatNumber:  i,
				Status:      BusinessSeatStatusAvailable,
			}
			if err := tx.Create(&seat).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func CountActiveBusinessSubscriptionsByWorkspace(workspaceId int) (int64, error) {
	var count int64
	activeStatuses := []string{
		BusinessSubscriptionStatusPendingActivation,
		BusinessSubscriptionStatusInvited,
		BusinessSubscriptionStatusActive,
		BusinessSubscriptionStatusExpiring,
		BusinessSubscriptionStatusPendingRemoval,
	}
	err := DB.Model(&BusinessSeatSubscription{}).
		Where("workspace_id = ? AND status IN ?", workspaceId, activeStatuses).
		Count(&count).Error
	return count, err
}

func AddBusinessSeatsToWorkspace(workspaceId, addCount int) error {
	if addCount <= 0 {
		return nil
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		var maxNumber int
		if err := tx.Model(&BusinessSeat{}).
			Where("workspace_id = ?", workspaceId).
			Select("COALESCE(MAX(seat_number), 0)").
			Scan(&maxNumber).Error; err != nil {
			return err
		}
		for i := 1; i <= addCount; i++ {
			seat := BusinessSeat{
				WorkspaceId: workspaceId,
				SeatType:    BusinessSeatTypeStandard,
				SeatNumber:  maxNumber + i,
				Status:      BusinessSeatStatusAvailable,
			}
			if err := tx.Create(&seat).Error; err != nil {
				return err
			}
		}
		return tx.Model(&BusinessWorkspace{}).Where("id = ?", workspaceId).
			Update("total_standard_seats", gorm.Expr("total_standard_seats + ?", addCount)).Error
	})
}

func GetBusinessProductByCode(code string) (*BusinessProduct, error) {
	var product BusinessProduct
	err := DB.Where("code = ?", code).First(&product).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessProductNotFound
		}
		return nil, err
	}
	return &product, nil
}

func GetBusinessProductById(id int) (*BusinessProduct, error) {
	var product BusinessProduct
	err := DB.First(&product, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessProductNotFound
		}
		return nil, err
	}
	return &product, nil
}

func ListBusinessProducts() ([]BusinessProduct, error) {
	var list []BusinessProduct
	err := DB.Order("id asc").Find(&list).Error
	return list, err
}

func GetEffectiveBusinessPriceVersion(productId int, at int64) (*BusinessPriceVersion, error) {
	var pv BusinessPriceVersion
	err := DB.Where("product_id = ? AND enabled = ? AND effective_from <= ?", productId, true, at).
		Where("effective_to IS NULL OR effective_to > ?", at).
		Order("effective_from desc, id desc").
		First(&pv).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessPriceVersionNotFound
		}
		return nil, err
	}
	return &pv, nil
}

func ListBusinessPriceVersions(productId int) ([]BusinessPriceVersion, error) {
	var list []BusinessPriceVersion
	err := DB.Where("product_id = ?", productId).Order("effective_from desc, id desc").Find(&list).Error
	return list, err
}

func CreateBusinessPriceVersion(pv *BusinessPriceVersion) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		now := common.GetTimestamp()
		var current BusinessPriceVersion
		err := tx.Where("product_id = ? AND enabled = ? AND effective_to IS NULL", pv.ProductId, true).
			Order("effective_from desc, id desc").
			First(&current).Error
		if err == nil {
			if err := tx.Model(&current).Updates(map[string]interface{}{
				"effective_to": now,
				"enabled":      false,
			}).Error; err != nil {
				return err
			}
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if pv.EffectiveFrom == 0 {
			pv.EffectiveFrom = now
		}
		pv.Enabled = true
		return tx.Create(pv).Error
	})
}

func GetBusinessQuoteById(id int) (*BusinessQuote, error) {
	var quote BusinessQuote
	err := DB.First(&quote, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessQuoteNotFound
		}
		return nil, err
	}
	return &quote, nil
}

func GetBusinessSeatOrderByOrderNo(orderNo string) (*BusinessSeatOrder, error) {
	var order BusinessSeatOrder
	err := DB.Where("order_no = ?", orderNo).First(&order).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessOrderNotFound
		}
		return nil, err
	}
	return &order, nil
}

func GetBusinessSeatOrderById(id int) (*BusinessSeatOrder, error) {
	var order BusinessSeatOrder
	err := DB.First(&order, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessOrderNotFound
		}
		return nil, err
	}
	return &order, nil
}

var (
	businessSeatCurrentLifecycleStatuses = []string{
		BusinessSubscriptionStatusPendingPayment,
		BusinessSubscriptionStatusPendingCapacity,
		BusinessSubscriptionStatusPendingActivation,
		BusinessSubscriptionStatusInvited,
		BusinessSubscriptionStatusActive,
		BusinessSubscriptionStatusExpiring,
		BusinessSubscriptionStatusPendingRemoval,
		BusinessSubscriptionStatusReactivationReq,
	}
	businessSeatHistoricalStatuses = []string{
		BusinessSubscriptionStatusRemoved,
		BusinessSubscriptionStatusExpired,
		BusinessSubscriptionStatusCancelled,
	}
)

func GetCurrentBusinessSeatSubscriptionByUserId(userId int) (*BusinessSeatSubscription, error) {
	var sub BusinessSeatSubscription
	err := DB.Where("user_id = ? AND status IN ?", userId, businessSeatCurrentLifecycleStatuses).
		Order("id desc").
		First(&sub).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessSubscriptionNotFound
		}
		return nil, err
	}
	return &sub, nil
}

func GetLatestBusinessSeatSubscriptionByUserId(userId int) (*BusinessSeatSubscription, error) {
	var sub BusinessSeatSubscription
	err := DB.Where("user_id = ?", userId).Order("id desc").First(&sub).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessSubscriptionNotFound
		}
		return nil, err
	}
	return &sub, nil
}

func ListBusinessSeatSubscriptionsByUserId(userId int) ([]BusinessSeatSubscription, error) {
	var list []BusinessSeatSubscription
	err := DB.Where("user_id = ?", userId).Order("id desc").Find(&list).Error
	return list, err
}

func GetBusinessSeatSubscriptionForUser(userId int) (*BusinessSeatSubscription, error) {
	sub, err := GetCurrentBusinessSeatSubscriptionByUserId(userId)
	if err == nil {
		return sub, nil
	}
	if !errors.Is(err, ErrBusinessSubscriptionNotFound) {
		return nil, err
	}
	var historical BusinessSeatSubscription
	err = DB.Where("user_id = ? AND status IN ?", userId, businessSeatHistoricalStatuses).
		Order("id desc").
		First(&historical).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessSubscriptionNotFound
		}
		return nil, err
	}
	return &historical, nil
}

func HasOpenBusinessSeatSubscription(userId int) (bool, error) {
	sub, err := GetCurrentBusinessSeatSubscriptionByUserId(userId)
	if err != nil {
		if errors.Is(err, ErrBusinessSubscriptionNotFound) {
			return false, nil
		}
		return false, err
	}
	return sub != nil, nil
}

func MaskBusinessEmail(email string) string {
	email = strings.TrimSpace(email)
	at := strings.LastIndex(email, "@")
	if at <= 0 {
		return email
	}
	local := email[:at]
	domain := email[at:]
	if len(local) <= 1 {
		return "*" + domain
	}
	return local[:1] + "***" + domain
}

// GetBusinessSeatSubscriptionByUserId returns the current lifecycle subscription,
// or the latest historical record when no current lifecycle subscription exists.
func GetBusinessSeatSubscriptionByUserId(userId int) (*BusinessSeatSubscription, error) {
	return GetBusinessSeatSubscriptionForUser(userId)
}

func GetBusinessSeatSubscriptionById(id int) (*BusinessSeatSubscription, error) {
	var sub BusinessSeatSubscription
	err := DB.First(&sub, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessSubscriptionNotFound
		}
		return nil, err
	}
	return &sub, nil
}

func ListBusinessSeatOrderItems(orderId int) ([]BusinessSeatOrderItem, error) {
	var items []BusinessSeatOrderItem
	err := DB.Where("order_id = ?", orderId).Order("id asc").Find(&items).Error
	return items, err
}

func GetBusinessSeatPoolStats(workspaceId int) (BusinessSeatPoolStats, error) {
	stats := BusinessSeatPoolStats{}
	type row struct {
		Status string
		Count  int
	}
	var rows []row
	err := DB.Model(&BusinessSeat{}).
		Select("status, count(*) as count").
		Where("workspace_id = ?", workspaceId).
		Group("status").
		Scan(&rows).Error
	if err != nil {
		return stats, err
	}
	for _, r := range rows {
		stats.Total += r.Count
		switch r.Status {
		case BusinessSeatStatusAvailable:
			stats.Available = r.Count
		case BusinessSeatStatusReserved:
			stats.Reserved = r.Count
		case BusinessSeatStatusInvited:
			stats.Invited = r.Count
		case BusinessSeatStatusActive:
			stats.Active = r.Count
		case BusinessSeatStatusPendingRelease:
			stats.PendingRelease = r.Count
		case BusinessSeatStatusDisabled:
			stats.Disabled = r.Count
		}
	}
	return stats, nil
}

func ListOpenBusinessSeatTasks(taskType string, limit int) ([]BusinessSeatTask, error) {
	if limit <= 0 {
		limit = 100
	}
	var tasks []BusinessSeatTask
	q := DB.Where("status = ?", BusinessTaskStatusOpen)
	if taskType != "" {
		q = q.Where("task_type = ?", taskType)
	}
	err := q.Order("id asc").Limit(limit).Find(&tasks).Error
	return tasks, err
}

func FindOpenBusinessSeatTask(taskType string, subscriptionId int) (*BusinessSeatTask, error) {
	return findOpenBusinessSeatTaskDB(DB, taskType, subscriptionId)
}

func FindOpenBusinessSeatTaskTx(tx *gorm.DB, taskType string, subscriptionId int) (*BusinessSeatTask, error) {
	if tx == nil {
		tx = DB
	}
	return findOpenBusinessSeatTaskDB(tx, taskType, subscriptionId)
}

func findOpenBusinessSeatTaskDB(db *gorm.DB, taskType string, subscriptionId int) (*BusinessSeatTask, error) {
	var task BusinessSeatTask
	err := db.Where("task_type = ? AND subscription_id = ? AND status = ?", taskType, subscriptionId, BusinessTaskStatusOpen).
		First(&task).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &task, nil
}

func EnsureBusinessProductSeed() error {
	var count int64
	if err := DB.Model(&BusinessProduct{}).Where("code = ?", BusinessProductCodeStandard).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	product := BusinessProduct{
		Code:     BusinessProductCodeStandard,
		Name:     "Business Standard",
		Provider: BusinessWorkspaceProviderOpenAI,
		Enabled:  true,
	}
	return DB.Create(&product).Error
}

func ExpireDueBusinessQuotes(now int64) (int64, error) {
	result := DB.Model(&BusinessQuote{}).
		Where("status = ? AND expires_at <= ?", BusinessQuoteStatusPending, now).
		Update("status", BusinessQuoteStatusExpired)
	return result.RowsAffected, result.Error
}

func ListBusinessSeatSubscriptions(filter map[string]interface{}, limit, offset int) ([]BusinessSeatSubscription, int64, error) {
	var list []BusinessSeatSubscription
	var total int64
	q := DB.Model(&BusinessSeatSubscription{})
	if status, ok := filter["status"].(string); ok && status != "" {
		q = q.Where("status = ?", status)
	}
	if workspaceId, ok := filter["workspace_id"].(int); ok && workspaceId > 0 {
		q = q.Where("workspace_id = ?", workspaceId)
	}
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id desc").Limit(limit).Offset(offset).Find(&list).Error
	return list, total, err
}

func ListBusinessSeatOrders(limit, offset int) ([]BusinessSeatOrder, int64, error) {
	var list []BusinessSeatOrder
	var total int64
	if err := DB.Model(&BusinessSeatOrder{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := DB.Order("id desc").Limit(limit).Offset(offset).Find(&list).Error
	return list, total, err
}

func ListBusinessSeatAuditLogs(limit, offset int) ([]BusinessSeatAuditLog, int64, error) {
	var list []BusinessSeatAuditLog
	var total int64
	if err := DB.Model(&BusinessSeatAuditLog{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := DB.Order("id desc").Limit(limit).Offset(offset).Find(&list).Error
	return list, total, err
}

func SumPaidBusinessSeatOrderAmountSince(since int64) (decimal.Decimal, error) {
	var total decimal.Decimal
	err := DB.Model(&BusinessSeatOrder{}).
		Where("status = ? AND paid_at >= ?", BusinessOrderStatusPaid, since).
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&total).Error
	return total, err
}

func GenerateBusinessSeatOrderNo(userId int) string {
	return fmt.Sprintf("BS%dNO%s%d", userId, common.GetRandomString(6), time.Now().Unix())
}
