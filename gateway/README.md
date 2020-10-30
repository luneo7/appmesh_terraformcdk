To build it run 

docker build -t gateway . 
docker tag gateway:latest ${ECR_REPO}/gateway:latest 
docker push ${ECR_REPO}/gateway:latest 