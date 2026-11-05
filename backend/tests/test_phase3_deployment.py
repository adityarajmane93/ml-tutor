"""Static deployment checks that do not need Docker, Railway, or PostgreSQL."""
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class PhaseThreeDeploymentTests(unittest.TestCase):
    def test_all_services_use_repository_root_compatible_dockerfiles(self):
        core = (ROOT / "backend/Dockerfile").read_text()
        ml = (ROOT / "services/ml_execution/Dockerfile").read_text()
        affect = (ROOT / "services/affect_inference/Dockerfile").read_text()
        compose = (ROOT / "docker-compose.yml").read_text()

        self.assertIn("COPY backend/requirements-core.txt", core)
        self.assertIn("COPY backend .", core)
        self.assertIn("COPY backend/requirements-ml.txt", ml)
        self.assertIn("COPY backend/requirements-affect.txt", affect)
        self.assertIn("build: {context: ., dockerfile: backend/Dockerfile}", compose)

    def test_all_service_health_checks_follow_the_runtime_port(self):
        for dockerfile in (
            ROOT / "backend/Dockerfile",
            ROOT / "services/ml_execution/Dockerfile",
            ROOT / "services/affect_inference/Dockerfile",
        ):
            content = dockerfile.read_text()
            self.assertIn("os.getenv('PORT', '8080')", content)
            self.assertIn("/health", content)

    def test_core_dependency_list_excludes_ml_runtime(self):
        requirements = (ROOT / "backend/requirements-core.txt").read_text().lower()
        for dependency in ("torch", "torchvision", "hsemotion", "scikit-learn"):
            self.assertNotIn(dependency, requirements)

    def test_worker_services_have_readiness_routes(self):
        for application in (
            ROOT / "services/ml_execution/app.py",
            ROOT / "services/affect_inference/app.py",
        ):
            self.assertIn('@app.get("/ready")', application.read_text())


if __name__ == "__main__":
    unittest.main()
