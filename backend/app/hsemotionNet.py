import cv2
import numpy as np
import torch
from timm.models.efficientnet import EfficientNet
from hsemotion.facial_emotions import HSEmotionRecognizer

# Tell PyTorch 2.6+ it is safe to load this specific architecture
torch.serialization.add_safe_globals([timm.layers.conv2d_same.Conv2dSame])

# GLOBAL INITIALIZATION (Runs only once!)
print("Loading HSEmotion Model into memory...")
device = 'cuda' if torch.cuda.is_available() else 'cpu'
fer = HSEmotionRecognizer(model_name='enet_b0_8_va_mtl', device=device)
print(f"HSEmotion Model Ready on {device}!")

def get_predictions(contents):
    """
    Processes the raw bytes and returns (valence, arousal, emotion).
    Returns None if the image fails to decode.
    """
    # Decode bytes directly into an OpenCV matrix in RAM
    nparr = np.frombuffer(contents, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img_bgr is None:
        return None

    # Convert BGR (OpenCV default) to RGB (Model requirement)
    image_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    emotion, scores = fer.predict_emotions(image_rgb, logits=True)
    valence = float(scores[-2])
    arousal = float(scores[-1])
    
    print(f"Valence: {valence:.3f}, Arousal: {arousal:.3f}, Emotion: {emotion}")
    return (valence, arousal)
