package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
)

func TestIsPricingAbilityAvailable(t *testing.T) {
	assert.True(t, IsPricingAbilityAvailable(AbilityWithChannel{
		Ability:         Ability{Enabled: true},
		ChannelStatus: common.ChannelStatusEnabled,
	}))
	assert.False(t, IsPricingAbilityAvailable(AbilityWithChannel{
		Ability:         Ability{Enabled: false},
		ChannelStatus: common.ChannelStatusEnabled,
	}))
	assert.False(t, IsPricingAbilityAvailable(AbilityWithChannel{
		Ability:         Ability{Enabled: true},
		ChannelStatus: common.ChannelStatusManuallyDisabled,
	}))
}
