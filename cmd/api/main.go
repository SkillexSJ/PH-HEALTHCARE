package main

import (
	"log"

	"github.com/SkillexSJ/PH-HEALTHCARE-GO/config"
	"github.com/SkillexSJ/PH-HEALTHCARE-GO/internal/modules/user"
	userDelivery "github.com/SkillexSJ/PH-HEALTHCARE-GO/internal/modules/user/delivery"
	userRepository "github.com/SkillexSJ/PH-HEALTHCARE-GO/internal/modules/user/repository"
	userUseCase "github.com/SkillexSJ/PH-HEALTHCARE-GO/internal/modules/user/usecase"
	"github.com/SkillexSJ/PH-HEALTHCARE-GO/internal/pkg/database"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/logger"
)

func main() {
	// 1. Load Config
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Could not load config: ", err)
	}

	// 2. Initialize Database
	database.ConnectDB(cfg)

	// 3. Auto Migrate Models
	database.DB.AutoMigrate(&user.User{})

	// 4. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName: "PH-Healthcare API v1",
	})
	app.Use(logger.New())

	// 5. Setup Modules (Dependency Injection)
	// Base API Group
	apiV1 := app.Group("/api/v1")

	// Init Repository
	userRepo := userRepository.NewUserRepository(database.DB)
	// Init UseCase
	userUC := userUseCase.NewUserUseCase(userRepo)
	// Init Handler (Delivery)
	userHandler := userDelivery.NewUserHandler(userUC)

	// Register Routes
	userDelivery.RegisterRoutes(apiV1, userHandler)

	// 6. Base Route
	app.Get("/health", func(c fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{
			"status":  "success",
			"message": "Server is running smoothly",
		})
	})

	// 7. Start Server
	port := cfg.AppPort
	if port == "" {
		port = "5000"
	}
	log.Fatal(app.Listen(":" + port))
}
