package repository

import (
	"github.com/SkillexSJ/PH-HEALTHCARE-GO/internal/modules/user"
	"gorm.io/gorm"
)

// UserRepository defines the methods that the UseCase layer can call
type UserRepository interface {
	Create(u *user.User) error
	FindByEmail(email string) (*user.User, error)
}

// userRepository is the concrete implementation
type userRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new instance of the repository
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

// Create inserts a new user into the database
func (r *userRepository) Create(u *user.User) error {
	return r.db.Create(u).Error
}

// FindByEmail searches for a user by email
func (r *userRepository) FindByEmail(email string) (*user.User, error) {
	var u user.User
	err := r.db.Where("email = ?", email).First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}
