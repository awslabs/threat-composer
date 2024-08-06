FROM public.ecr.aws/p9i6h6j0/aws-pdk:latest as build

#install dependencies
RUN dnf -y install rsync

# Create a non-root user named 'app' and set up home directory
RUN useradd -m app

# Create an app directory and change its ownership to the 'app' user
RUN mkdir /app && chown app:app /app

# Switch to the 'app' user
USER app

# Set the working directory to the app directory
WORKDIR /app

#Copy files into the Docker image
COPY --chown=app:app . .
RUN ./scripts/build.sh

# Stage 2: Serve the application using Nginx
FROM nginx:alpine
# Remove the default nginx website
RUN rm -rf /usr/share/nginx/html/*
# Copy the build output to the nginx html directory
COPY --from=build /app/packages/threat-composer-app/build/website/ /usr/share/nginx/html
# Copy custom nginx configuration if any
#iCOPY nginx.conf /etc/nginx/nginx.conf
# Expose port 80
EXPOSE 80
# Start nginx
CMD ["nginx", "-g", "daemon off;"]
