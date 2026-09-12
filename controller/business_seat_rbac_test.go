package controller

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupBusinessSeatRBACTest(t *testing.T) (commonUserToken, adminToken string) {
	t.Helper()
	previousDB, previousLogDB := model.DB, model.LOG_DB
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(
		&model.AuditLog{},
		&model.User{},
		&model.UserSession{},
		&model.BusinessWorkspace{},
		&model.BusinessProduct{},
		&model.BusinessPriceVersion{},
		&model.BusinessQuote{},
		&model.BusinessSeatOrder{},
		&model.BusinessSeatOrderItem{},
		&model.BusinessSeatSubscription{},
		&model.BusinessSeat{},
		&model.BusinessSeatTask{},
		&model.BusinessSeatAuditLog{},
	))
	model.DB = db
	model.LOG_DB = db
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	common.RedisEnabled = false
	common.SessionSecret = "business-seat-rbac-test-secret"
	require.NoError(t, model.EnsureBusinessProductSeed())
	require.NoError(t, model.CreateBusinessWorkspace(&model.BusinessWorkspace{
		Name: "RBAC Test WS", Provider: model.BusinessWorkspaceProviderOpenAI,
		WorkspaceType: model.BusinessWorkspaceTypeChatGPTBusiness, Status: model.BusinessWorkspaceStatusActive,
		BillingCadence: model.BusinessBillingCadenceMonthly, BillingAnchorAt: 1,
		BillingTimezone: "Asia/Shanghai", CycleStartGraceMinutes: 60, TotalStandardSeats: 1,
	}))
	t.Cleanup(func() {
		model.DB = previousDB
		model.LOG_DB = previousLogDB
	})

	commonPat := "common-user-pat-token"
	adminPat := "admin-user-pat-token"
	require.NoError(t, db.Create(&model.User{
		Username: "bs-common", Password: "placeholder", Role: common.RoleCommonUser,
		Status: common.UserStatusEnabled, Group: "default", AccessToken: &commonPat, AuthVersion: 1, AffCode: "bs-common",
	}).Error)
	require.NoError(t, db.Create(&model.User{
		Username: "bs-admin", Password: "placeholder", Role: common.RoleAdminUser,
		Status: common.UserStatusEnabled, Group: "default", AccessToken: &adminPat, AuthVersion: 1, AffCode: "bs-admin",
	}).Error)
	return commonPat, adminPat
}

func businessSeatAdminRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	admin := router.Group("/api/business-seat/admin")
	admin.Use(middleware.AdminAuth())
	{
		admin.GET("/workspaces", AdminListBusinessWorkspaces)
		admin.DELETE("/workspaces/:id", AdminDeleteBusinessWorkspace)
		admin.GET("/tasks", AdminListBusinessTasks)
		admin.GET("/seats", AdminListBusinessSeats)
		admin.GET("/pricing", AdminListBusinessPriceVersions)
		admin.GET("/subscriptions", AdminListBusinessSubscriptions)
	}
	return router
}

func requestWithPAT(router http.Handler, method, path, token string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, nil)
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestBusinessSeatAdminRBACCommonUserDenied(t *testing.T) {
	commonToken, _ := setupBusinessSeatRBACTest(t)
	router := businessSeatAdminRouter()
	endpoints := []string{
		"/api/business-seat/admin/workspaces",
		"/api/business-seat/admin/tasks",
		"/api/business-seat/admin/seats",
		"/api/business-seat/admin/pricing",
		"/api/business-seat/admin/subscriptions",
	}
	for _, path := range endpoints {
		response := requestWithPAT(router, http.MethodGet, path, commonToken)
		assert.Equal(t, http.StatusForbidden, response.Code, path)
		assert.Contains(t, response.Body.String(), "AUTH_INSUFFICIENT_PRIVILEGE")
	}
}

func TestBusinessSeatAdminRBACAdminAllowed(t *testing.T) {
	_, adminToken := setupBusinessSeatRBACTest(t)
	router := businessSeatAdminRouter()
	endpoints := []string{
		"/api/business-seat/admin/workspaces",
		"/api/business-seat/admin/tasks",
		"/api/business-seat/admin/seats",
		"/api/business-seat/admin/pricing",
		"/api/business-seat/admin/subscriptions",
	}
	for _, path := range endpoints {
		response := requestWithPAT(router, http.MethodGet, path, adminToken)
		assert.Equal(t, http.StatusOK, response.Code, path)
		assert.True(t, strings.Contains(response.Body.String(), `"success":true`), path)
	}
}

func TestBusinessSeatAdminRBACUnauthenticatedDenied(t *testing.T) {
	setupBusinessSeatRBACTest(t)
	router := businessSeatAdminRouter()
	response := requestWithPAT(router, http.MethodGet, "/api/business-seat/admin/workspaces", "")
	assert.Equal(t, http.StatusUnauthorized, response.Code)
}

func TestBusinessSeatAdminDeletesEmptyWorkspace(t *testing.T) {
	_, adminToken := setupBusinessSeatRBACTest(t)
	workspace, err := model.GetDefaultBusinessWorkspace()
	require.NoError(t, err)

	response := requestWithPAT(
		businessSeatAdminRouter(),
		http.MethodDelete,
		"/api/business-seat/admin/workspaces/"+strconv.Itoa(workspace.Id),
		adminToken,
	)
	require.Equal(t, http.StatusOK, response.Code)

	deleted, err := model.GetBusinessWorkspaceById(workspace.Id)
	require.NoError(t, err)
	assert.Equal(t, model.BusinessWorkspaceStatusDisabled, deleted.Status)
	list, err := model.ListBusinessWorkspaces()
	require.NoError(t, err)
	assert.Empty(t, list)
}
