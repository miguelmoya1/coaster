FROM node:26-alpine

RUN apk add --no-cache openjdk17-jre

RUN npm install -g firebase-tools

WORKDIR /app

COPY firebase.json .firebaserc ./

EXPOSE 9099
EXPOSE 4000

CMD ["firebase", "emulators:start", "--only", "auth", "--import=./.firebase-data", "--export-on-exit=./.firebase-data"]
