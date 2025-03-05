# Use a more specific Node.js image (avoid Alpine which uses musl)
FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# First copy just package files to leverage Docker caching
COPY package*.json ./

# Install dependencies with specific platform target for binary modules
# This uses the '--platform=linux' flag to ensure proper binary compatibility
RUN npm install --platform=linux --omit=dev --ignore-scripts

# Force reinstall of rollup to fix the missing module issue
RUN npm install rollup@latest --platform=linux

# Then copy the rest of the application
COPY . .

# Expose the port
EXPOSE 5173

# Start the development server, binding to all interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]