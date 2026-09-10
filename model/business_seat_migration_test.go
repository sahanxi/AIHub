package model

import (
	"os"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var businessSeatModels = []any{
	&BusinessWorkspace{},
	&BusinessProduct{},
	&BusinessPriceVersion{},
	&BusinessQuote{},
	&BusinessSeatOrder{},
	&BusinessSeatOrderItem{},
	&BusinessSeatSubscription{},
	&BusinessSeat{},
	&BusinessSeatTask{},
	&BusinessSeatAuditLog{},
}

func migrateBusinessSeatTables(db *gorm.DB) error {
	return db.AutoMigrate(businessSeatModels...)
}

func testBusinessSeatMigrationIdempotent(t *testing.T, db *gorm.DB) {
	t.Helper()
	for i := 0; i < 3; i++ {
		require.NoError(t, migrateBusinessSeatTables(db), "migration pass %d", i+1)
	}
	for i := 0; i < 3; i++ {
		require.NoError(t, EnsureBusinessProductSeed(), "seed pass %d", i+1)
	}
	var productCount int64
	require.NoError(t, db.Model(&BusinessProduct{}).Where("code = ?", BusinessProductCodeStandard).Count(&productCount).Error)
	assert.EqualValues(t, 1, productCount)

	var product BusinessProduct
	require.NoError(t, db.Where("code = ?", BusinessProductCodeStandard).First(&product).Error)
	pv := BusinessPriceVersion{
		ProductId:      product.Id,
		PriceAmount:    decimal.RequireFromString("199.00"),
		Currency:       "CNY",
		BillingCadence: BusinessBillingCadenceMonthly,
		DisplayUnit:    "/ month",
		EffectiveFrom:  1,
		Enabled:        true,
	}
	require.NoError(t, db.Create(&pv).Error)
	var stored BusinessPriceVersion
	require.NoError(t, db.First(&stored, pv.Id).Error)
	assert.True(t, stored.PriceAmount.Equal(decimal.RequireFromString("199.00")))
}

func TestBusinessSeatMigrationSQLite(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	previous := DB
	DB = db
	t.Cleanup(func() { DB = previous })
	testBusinessSeatMigrationIdempotent(t, db)
}

func TestBusinessSeatMigrationMySQL(t *testing.T) {
	dsn := strings.TrimSpace(os.Getenv("TEST_MYSQL_DSN"))
	if dsn == "" {
		t.Skip("TEST_MYSQL_DSN is not configured")
	}
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	previous := DB
	DB = db
	t.Cleanup(func() { DB = previous })
	testBusinessSeatMigrationIdempotent(t, db)
}

func TestBusinessSeatMigrationPostgreSQL(t *testing.T) {
	dsn := strings.TrimSpace(os.Getenv("TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("TEST_POSTGRES_DSN is not configured")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	previous := DB
	DB = db
	t.Cleanup(func() { DB = previous })
	testBusinessSeatMigrationIdempotent(t, db)
}
