package config

import (
	"log"

	"github.com/spf13/viper"
)

type Config struct {
	AppPort    string `mapstructure:"PORT"`
	DBHost     string `mapstructure:"DB_HOST"`
	DBUser     string `mapstructure:"DB_USER"`
	DBPassword string `mapstructure:"DB_PASSWORD"`
	DBName     string `mapstructure:"DB_NAME"`
	DBPort     string `mapstructure:"DB_PORT"`
	DBSSLMode  string `mapstructure:"DB_SSLMODE"`
}

func LoadConfig() (config Config, err error) {
	viper.SetConfigFile(".env") // Read from .env file
	viper.AutomaticEnv()        // Read from OS environment variables (overrides .env)

	err = viper.ReadInConfig()
	if err != nil {
		log.Println("Config file not found, using environment variables")
	}

	err = viper.Unmarshal(&config)
	return
}
