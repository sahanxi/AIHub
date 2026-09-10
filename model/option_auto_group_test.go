package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateOptionValueRejectsInvalidMaxTokenAutoGroups(t *testing.T) {
	for _, value := range []string{"", "0", "-1", "1.5", "invalid"} {
		t.Run(value, func(t *testing.T) {
			assert.Error(t, validateOptionValue("MaxTokenAutoGroups", value))
		})
	}
	require.NoError(t, validateOptionValue("MaxTokenAutoGroups", "999999"))
}

func TestValidateOptionValueRejectsInvalidDefaultUserGroup(t *testing.T) {
	assert.Error(t, validateOptionValue("DefaultUserGroup", ""))
	assert.Error(t, validateOptionValue("DefaultUserGroup", "   "))
	assert.Error(t, validateOptionValue("DefaultUserGroup", "default,standard"))
	assert.Error(t, validateOptionValue("DefaultUserGroup", "std ard"))
	require.NoError(t, validateOptionValue("DefaultUserGroup", "standard"))
	require.NoError(t, validateOptionValue("DefaultUserGroup", "  vip  "))
}
