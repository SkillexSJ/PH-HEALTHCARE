package delivery

import (
	"github.com/SkillexSJ/PH-HEALTHCARE-GO/internal/modules/user"
	"github.com/SkillexSJ/PH-HEALTHCARE-GO/internal/modules/user/usecase"
	"github.com/gofiber/fiber/v3"
)

// UserHandler holds the usecase dependency
type UserHandler struct {
	userUseCase usecase.UserUseCase
}

// NewUserHandler initializes the handler
func NewUserHandler(uc usecase.UserUseCase) *UserHandler {
	return &UserHandler{userUseCase: uc}
}

// RegisterDTO defines the expected payload for registration
type RegisterDTO struct {
	Name     string `json:"name" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

// Register handles the HTTP request
func (h *UserHandler) Register(c fiber.Ctx) error {
	var req RegisterDTO

	// 1. Parse Body
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// 2. Map DTO to Domain Model
	newUser := user.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
	}

	// 3. Call UseCase
	if err := h.userUseCase.RegisterUser(&newUser); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 4. Return Response
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User registered successfully",
		"data":    newUser,
	})
}
