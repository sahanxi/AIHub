package middleware

import (
	"os"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	config := cors.DefaultConfig()
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"*"}

	origins := strings.TrimSpace(os.Getenv("CORS_ALLOW_ORIGINS"))
	if origins == "" || origins == "*" {
		// Browser console is same-origin. API clients authenticate with
		// Authorization, not cookies. Never pair wildcard origin with credentials.
		config.AllowAllOrigins = true
		config.AllowCredentials = false
	} else {
		parts := strings.Split(origins, ",")
		allow := make([]string, 0, len(parts))
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part != "" {
				allow = append(allow, part)
			}
		}
		config.AllowOrigins = allow
		config.AllowCredentials = true
	}
	return cors.New(config)
}

func Version() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-New-Api-Version", common.Version)
		c.Next()
	}
}
