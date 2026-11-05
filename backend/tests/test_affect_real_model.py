"""Optional local integration test; never runs in CI without explicit opt-in."""
import os
import unittest


@unittest.skipUnless(os.getenv("RUN_REAL_HSEMOTION_TEST") == "1", "set RUN_REAL_HSEMOTION_TEST=1 with HSE_TEST_IMAGE")
class RealHSEmotionTest(unittest.TestCase):
    def test_real_model_predicts_valence_and_arousal(self):
        image_path = os.environ["HSE_TEST_IMAGE"]
        with open(image_path, "rb") as image:
            contents = image.read()
        from app.hsemotionNet import get_predictions

        prediction = get_predictions(contents)
        self.assertIsNotNone(prediction)
        self.assertEqual(len(prediction), 2)
