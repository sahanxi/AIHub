package setting

import (
	"strconv"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
)

const (
	BusinessSeatEnabledOptionKey       = "BusinessSeatEnabled"
	BusinessSeatQuoteTTLMinutesKey     = "BusinessSeatQuoteTTLMinutes"
	BusinessSeatDefaultGraceMinutesKey = "BusinessSeatDefaultGraceMinutes"
)

var (
	businessSeatSettingMutex sync.RWMutex
	BusinessSeatEnabled      = false
	BusinessSeatQuoteTTLMinutes = 15
	BusinessSeatDefaultGraceMinutes = 60
)

func BusinessSeatEnabledFromOption(value string) bool {
	return strings.EqualFold(strings.TrimSpace(value), "true") || strings.TrimSpace(value) == "1"
}

func SyncBusinessSeatSettingsFromOptionMap() {
	businessSeatSettingMutex.Lock()
	defer businessSeatSettingMutex.Unlock()
	if value, ok := common.OptionMap[BusinessSeatEnabledOptionKey]; ok {
		BusinessSeatEnabled = BusinessSeatEnabledFromOption(value)
	}
	if value, ok := common.OptionMap[BusinessSeatQuoteTTLMinutesKey]; ok {
		if minutes, err := strconv.Atoi(strings.TrimSpace(value)); err == nil && minutes > 0 {
			BusinessSeatQuoteTTLMinutes = minutes
		}
	}
	if value, ok := common.OptionMap[BusinessSeatDefaultGraceMinutesKey]; ok {
		if minutes, err := strconv.Atoi(strings.TrimSpace(value)); err == nil && minutes >= 0 {
			BusinessSeatDefaultGraceMinutes = minutes
		}
	}
}

func IsBusinessSeatSalesEnabled() bool {
	businessSeatSettingMutex.RLock()
	defer businessSeatSettingMutex.RUnlock()
	return BusinessSeatEnabled
}

func BusinessSeatQuoteTTLSeconds() int {
	businessSeatSettingMutex.RLock()
	defer businessSeatSettingMutex.RUnlock()
	return BusinessSeatQuoteTTLMinutes * 60
}

func BusinessSeatDefaultGraceMinutesValue() int {
	businessSeatSettingMutex.RLock()
	defer businessSeatSettingMutex.RUnlock()
	return BusinessSeatDefaultGraceMinutes
}
