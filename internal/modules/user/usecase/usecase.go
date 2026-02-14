package usecase

import (
	"errors"

	"github.com/SkillexSJ/PH-HEALTHCARE-GO/internal/modules/user"
	"github.com/SkillexSJ/PH-HEALTHCARE-GO/internal/modules/user/repository"
)

// UserUseCase defines the business logic
type UserUseCase interface {
	RegisterUser(u *user.User) error
}

// userUseCase is the concrete implementation
type userUseCase struct {
	userRepo repository.UserRepository
}

// NewUserUseCase creates a new instance of the usecase
func NewUserUseCase(repo repository.UserRepository) UserUseCase {
	return &userUseCase{userRepo: repo}
}

// RegisterUser handles the business logic for creating a user
func (uc *userUseCase) RegisterUser(u *user.User) error {
	// 1. Check if user already exists
	existingUser, _ := uc.userRepo.FindByEmail(u.Email)
	if existingUser != nil {
		return errors.New("user with this email already exists")
	}

	// 2. Hash Password (TODO: Implement proper hashing using bcrypt)
	// u.Password = hashPassword(u.Password)

	// 3. Save to database
	return uc.userRepo.Create(u)
}
