# Use Node.js LTS (Long Term Support) version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Create volume mount point for persistent state
VOLUME ["/app/data"]

# Set environment variables (override with docker-compose or -e flags)
ENV NODE_ENV=production

# Run the bot
CMD ["node", "bot.js"]
