FROM node:20-alpine
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Create uploads directory and set permissions to node user
RUN mkdir -p uploads && chown -R node:node /app

# Switch to the non-root "node" user
USER node

EXPOSE 5000
CMD ["node", "index.js"]
