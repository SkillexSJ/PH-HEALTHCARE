package delivery

import "github.com/gofiber/fiber/v3"

// RegisterRoutes maps the route URLs to the handler functions
func RegisterRoutes(router fiber.Router, h *UserHandler) {
	users := router.Group("/users")

	users.Post("/register", h.Register)
}
