import socket

from ultralytics import YOLO

# Load model
model = YOLO("yolov8n.pt")

# Create a socket connection to the server
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server_address = ("localhost", 3000)
sock.connect(server_address)

try:
    while True:
        # Perform object detection
        results = model(source=0, show=True, conf=0.5)

        for r in results:
            boxes = r.boxes
            labels = r.labels  # Assuming labels are available in results

            # Check if a person or more than one person is detected
            if "person" in labels:
                print("Person(s) detected!")
                # Send '8' to the server (which will forward it to the Arduino)
                sock.sendall(b"8")
            else:
                print("No person detected.")
                # Send '9' to the server (which will forward it to the Arduino)
                sock.sendall(b"9")

            print(boxes)

finally:
    # Clean up the socket connection
    sock.close()
