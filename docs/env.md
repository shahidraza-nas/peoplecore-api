<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# Environment Variables Setup

[Back to setup](./setup.md)

## Getting Started

1. Copy the `.env.example` file to create a new `.env` file (if not exists)
2. Update the values according to your environment

   ```bash
   cp .env.example .env
   ```

## Environment Variables Reference

### Application Settings

```bash
# Node environment (development/production/test)
NODE_ENV=development

# Application port
PORT=3000

# Base URL for the application
BASE_URL=http://localhost:3000

# CDN URL for static assets
CDN_URL=http://cdn.localhost:3000
```

### AWS Configuration

```bash
# AWS Secret Manager ID for storing sensitive data
AWS_ENV_SECRET_ID=your_aws_secret_id
```

Note: In production, use AWS secret manager instead of .env file to store sensitive variables like database configs, stripe keys, etc and use your `AWS_ENV_SECRET_ID` here

### Database Configuration

```bash
# PostgreSQL/MySQL database connection settings
DATABASE_HOST=localhost       # Database host
DATABASE_PORT=3306           # Database port
DATABASE_USERNAME=root       # Database username
DATABASE_PASSWORD=           # Database password
DATABASE_NAME=nest          # Database name

# Database behavior settings
DATABASE_ALTER_SYNC=        # Enable auto schema alterations (Y/N)
DATABASE_LOGGING=           # Enable SQL query logging (Y/N)
DATABASE_DISABLE_SSL=Y      # Disable SSL for local development
```

### Seeder Configuration

```bash
# Wait for seeder completion
SEEDER_AWAIT=Y             # Wait for seeder to complete before starting app
```

### MongoDB Configuration

```bash
# MongoDB connection settings
MONGO_URI=mongodb://localhost/nest  # MongoDB connection string
MONGO_LOGGING=                      # Enable MongoDB query logging (Y/N)
```

## Tips

1. Never commit `.env` file to version control
2. Keep `.env.example` updated with all required variables
3. Use appropriate values for each environment (development/staging/production)
4. For production, ensure secure values and enable SSL
5. Regular backup of production environment variables is recommended

## Security Notes

- Keep your production credentials secure
- Use strong passwords for database access
- Enable SSL in production environments
- Regularly rotate sensitive credentials
- Use secret managers for production environments
