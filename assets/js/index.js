document.addEventListener('DOMContentLoaded', () => {
  const cam = document.getElementById('cam');
  const startCameraBtn = document.getElementById('start-camera-btn');

  const startVideo = () => {
      navigator.mediaDevices.enumerateDevices()
          .then(devices => {
              if (Array.isArray(devices)) {
                  devices.forEach(device => {
                      if (device.kind === 'videoinput') {
                          navigator.mediaDevices.getUserMedia({ video: { deviceId: device.deviceId } })
                              .then(stream => {
                                  cam.srcObject = stream;
                              })
                              .catch(error => {
                                  console.error('Erro ao acessar a câmera:', error);
                              });
                      }
                  });
              }
          })
          .catch(error => {
              console.error('Erro ao enumerar dispositivos:', error);
          });
  };

  startCameraBtn.addEventListener('click', startVideo);

  const loadLabels = () => {
      const labels = ['Henzo', 'Leo', 'Cristiano', 'Caua', 'Eryck'];
      return Promise.all(labels.map(async label => {
          const descriptions = [];
          for (let i = 1; i <= 5; i++) {
              const img = await faceapi.fetchImage(`/assets/lib/face-api/labels/${label}/${i}.jpg`);
              const detections = await faceapi
                  .detectSingleFace(img)
                  .withFaceLandmarks()
                  .withFaceDescriptor();
              descriptions.push(detections.descriptor);
          }
          return new faceapi.LabeledFaceDescriptors(label, descriptions);
      }));
  };

  Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/assets/lib/face-api/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/assets/lib/face-api/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/assets/lib/face-api/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/assets/lib/face-api/models'),
      faceapi.nets.ageGenderNet.loadFromUri('/assets/lib/face-api/models'),
      faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/lib/face-api/models'),
  ]);

  cam.addEventListener('play', async () => {
      const canvas = faceapi.createCanvasFromMedia(cam);
      const canvasSize = {
          width: cam.width,
          height: cam.height
      };
      const labels = await loadLabels();
      faceapi.matchDimensions(canvas, canvasSize);
      document.body.appendChild(canvas);
      setInterval(async () => {
          const detections = await faceapi
              .detectAllFaces(
                  cam,
                  new faceapi.TinyFaceDetectorOptions()
              )
              .withFaceLandmarks()
              .withFaceExpressions()
              .withAgeAndGender()
              .withFaceDescriptors();
          const resizedDetections = faceapi.resizeResults(detections, canvasSize);
          const faceMatcher = new faceapi.FaceMatcher(labels, 0.6);
          const results = resizedDetections.map(d =>
              faceMatcher.findBestMatch(d.descriptor)
          );
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
          resizedDetections.forEach(detection => {
              const { age, gender, genderProbability } = detection;
              new faceapi.draw.DrawTextField([
                  `${parseInt(age, 10)} years`,
                  `${gender} (${parseInt(genderProbability * 100, 10)})`
              ], detection.detection.box.topRight).draw(canvas);
          });
          results.forEach((result, index) => {
              const box = resizedDetections[index].detection.box;
              const { label, distance } = result;
              new faceapi.draw.DrawTextField([
                  `${label} (${parseInt(distance * 100, 10)})`
              ], box.bottomRight).draw(canvas);
                
              if (label !== 'unknown') {
                localStorage.setItem('usuarioReconhecido', label);
                setTimeout(() => {
                    window.location.href = '/jogo.html'; 
                }, 6000); 
            }
          });
      }, 100);
  });
});
