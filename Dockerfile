FROM --platform=linux/x86_64 public.ecr.aws/amazonlinux/amazonlinux:latest as build

RUN dnf install tar gzip python3 gcc-c++ make python3-pip rsync shadow-utils -y

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 22

# Use bash for the shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Create a script file sourced by both interactive and non-interactive bash shells
ENV BASH_ENV /tmp/bash_env
RUN mkdir /usr/local/nvm
RUN touch "${BASH_ENV}"
RUN echo '. "${BASH_ENV}"' >> ~/.bashrc

# Download and install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | PROFILE="${BASH_ENV}" bash
RUN echo node > .nvmrc
RUN nvm install $NODE_VERSION

# Required to build the threat-composer app
RUN npm install -g @aws/pdk yarn

# Create a non-root user named 'app' and set up home directory
RUN useradd -m app


# # Create an app directory and change its ownership to the 'app' user
RUN mkdir /app && chown app:app /app

# # Switch to the 'app' user
USER app
# Set the path so we can use pdk
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/v$NODE_VERSION/bin:$PATH

# # Set the working directory to the app directory
WORKDIR /app

# #Copy files into the Docker image
COPY --chown=app:app . .
RUN ./scripts/build.sh

# # Stage 2: Serve the application using Nginx
FROM nginx:alpine
# Remove the default nginx website
RUN rm -rf /usr/share/nginx/html/*
# # Copy the build output to the nginx html directory
COPY --from=build /app/packages/threat-composer-app/build/website/ /usr/share/nginx/html
# # Expose port 80
EXPOSE 80
# # Start nginx
CMD ["nginx", "-g", "daemon off;"]
