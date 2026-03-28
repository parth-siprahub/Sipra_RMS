"""
AC Spec Generator - Generate feature lists from specifications.

Transforms parsed specifications into actionable feature lists
with testable acceptance criteria for autonomous implementation.
"""

import json
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, List, Any


@dataclass
class Feature:
    """A single feature to implement."""
    id: str
    description: str
    category: str = "general"
    status: str = "pending"
    passes: bool = False
    test_cases: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    estimated_effort: str = ""
    priority: int = 5
    requirement_id: str = ""


@dataclass
class FeatureList:
    """Complete feature list for a project."""
    features: List[Feature] = field(default_factory=list)
    total: int = 0
    completed: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


class SpecGenerator:
    """
    Generate comprehensive feature lists from specifications.

    Usage:
        generator = SpecGenerator(project_dir)
        feature_list = await generator.generate(spec)
    """

    FEATURE_LIST_FILE = "feature_list.json"

    # Category mappings
    CATEGORY_PATTERNS = {
        "authentication": ["auth", "login", "register", "password", "session"],
        "api": ["api", "endpoint", "rest", "graphql", "route"],
        "data": ["database", "model", "schema", "migration", "storage"],
        "ui": ["ui", "component", "page", "view", "layout", "form"],
        "core": ["core", "main", "primary", "essential"],
        "testing": ["test", "spec", "coverage", "mock"],
        "deployment": ["deploy", "ci", "cd", "docker", "kubernetes"],
        "security": ["security", "encryption", "permission", "role"],
    }

    def __init__(self, project_dir: Path):
        self.project_dir = Path(project_dir)

    async def generate(self, spec: Any) -> FeatureList:
        """
        Generate feature list from parsed specification.

        Args:
            spec: Parsed ProjectSpec object

        Returns:
            Generated FeatureList
        """
        features = []
        feature_counter = {}

        # Generate features from requirements
        for req in spec.requirements:
            category = self._determine_category(req.description)
            feature_counter[category] = feature_counter.get(category, 0) + 1

            # Create main feature from requirement
            feature = Feature(
                id=f"{category}-{feature_counter[category]:03d}",
                description=req.description,
                category=category,
                priority=self._priority_to_int(req.priority),
                requirement_id=req.id,
                test_cases=req.acceptance_criteria or self._generate_test_cases(req.description),
                estimated_effort=self._estimate_effort(req.description)
            )
            features.append(feature)

            # Decompose into sub-features if complex
            sub_features = self._decompose_requirement(req, category, feature_counter)
            features.extend(sub_features)

        # Add infrastructure features
        infra_features = self._generate_infrastructure_features(spec, feature_counter)
        features.extend(infra_features)

        # Add testing features
        test_features = self._generate_testing_features(spec, feature_counter)
        features.extend(test_features)

        # Sort by priority and dependencies
        features = self._sort_features(features)

        # Build dependency graph
        features = self._resolve_dependencies(features)

        return FeatureList(
            features=features,
            total=len(features),
            completed=0,
            metadata={
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "spec_source": spec.source_file if hasattr(spec, 'source_file') else "",
                "project_name": spec.name if hasattr(spec, 'name') else ""
            }
        )

    async def save_feature_list(self, feature_list: FeatureList) -> Path:
        """Save feature list to JSON file."""
        path = self.project_dir / self.FEATURE_LIST_FILE

        data = {
            "features": [asdict(f) for f in feature_list.features],
            "total": feature_list.total,
            "completed": feature_list.completed,
            "metadata": feature_list.metadata
        }

        with open(path, 'w') as f:
            json.dump(data, f, indent=2)

        return path

    async def load_feature_list(self) -> Optional[FeatureList]:
        """Load existing feature list."""
        path = self.project_dir / self.FEATURE_LIST_FILE

        if not path.exists():
            return None

        with open(path) as f:
            data = json.load(f)

        features = [Feature(**f) for f in data.get("features", [])]

        return FeatureList(
            features=features,
            total=data.get("total", len(features)),
            completed=data.get("completed", 0),
            metadata=data.get("metadata", {})
        )

    def _determine_category(self, description: str) -> str:
        """Determine feature category from description."""
        desc_lower = description.lower()

        for category, patterns in self.CATEGORY_PATTERNS.items():
            for pattern in patterns:
                if pattern in desc_lower:
                    return category

        return "core"

    def _priority_to_int(self, priority: str) -> int:
        """Convert priority string to integer."""
        return {"high": 1, "medium": 5, "low": 9}.get(priority.lower(), 5)

    def _generate_test_cases(self, description: str) -> List[str]:
        """Generate default test cases for a feature."""
        base_tests = [
            f"Successfully {description.lower()}",
            f"Handle error when {description.lower()} fails",
        ]

        # Add specific tests based on description
        desc_lower = description.lower()
        if "create" in desc_lower or "add" in desc_lower:
            base_tests.append("Validate required fields")
            base_tests.append("Handle duplicate entries")
        elif "delete" in desc_lower or "remove" in desc_lower:
            base_tests.append("Confirm before deletion")
            base_tests.append("Handle non-existent items")
        elif "update" in desc_lower or "edit" in desc_lower:
            base_tests.append("Preserve unchanged fields")
            base_tests.append("Validate updated data")

        return base_tests

    def _estimate_effort(self, description: str) -> str:
        """Estimate effort for a feature."""
        desc_lower = description.lower()

        # Complex indicators
        complex_words = ["integrate", "oauth", "payment", "real-time", "algorithm"]
        if any(word in desc_lower for word in complex_words):
            return "4h"

        # Medium indicators
        medium_words = ["api", "database", "authentication", "form"]
        if any(word in desc_lower for word in medium_words):
            return "2h"

        return "1h"

    def _decompose_requirement(
        self,
        req: Any,
        category: str,
        counter: Dict[str, int]
    ) -> List[Feature]:
        """Decompose complex requirements into sub-features."""
        sub_features = []
        desc_lower = req.description.lower()

        # CRUD decomposition
        if "crud" in desc_lower or "manage" in desc_lower:
            operations = ["Create", "Read/List", "Update", "Delete"]
            for op in operations:
                counter[category] = counter.get(category, 0) + 1
                sub_features.append(Feature(
                    id=f"{category}-{counter[category]:03d}",
                    description=f"{op} operation for {req.description}",
                    category=category,
                    priority=self._priority_to_int(req.priority),
                    dependencies=[f"{category}-{counter[category]-len(operations):03d}"],
                    test_cases=[f"{op} succeeds", f"{op} handles errors"],
                    estimated_effort="1h"
                ))

        # Auth decomposition
        if "authentication" in desc_lower:
            auth_features = [
                ("Login with credentials", []),
                ("Logout and session cleanup", ["auth-001"]),
                ("Password reset flow", ["auth-001"]),
                ("Session management", ["auth-001"])
            ]
            for desc, deps in auth_features:
                counter["authentication"] = counter.get("authentication", 0) + 1
                sub_features.append(Feature(
                    id=f"authentication-{counter['authentication']:03d}",
                    description=desc,
                    category="authentication",
                    priority=2,
                    dependencies=deps,
                    test_cases=[f"{desc} works correctly", f"{desc} handles errors"],
                    estimated_effort="2h"
                ))

        return sub_features

    def _generate_infrastructure_features(
        self,
        spec: Any,
        counter: Dict[str, int]
    ) -> List[Feature]:
        """Generate infrastructure setup features."""
        features = []

        # Project setup
        counter["core"] = counter.get("core", 0) + 1
        features.append(Feature(
            id=f"core-{counter['core']:03d}",
            description="Initialize project structure and dependencies",
            category="core",
            priority=1,
            test_cases=["Project builds successfully", "Dependencies install"],
            estimated_effort="1h"
        ))

        # Database setup if needed
        if hasattr(spec, 'technology') and spec.technology.database:
            counter["data"] = counter.get("data", 0) + 1
            features.append(Feature(
                id=f"data-{counter['data']:03d}",
                description=f"Set up {spec.technology.database} database",
                category="data",
                priority=1,
                test_cases=["Database connection works", "Migrations run"],
                estimated_effort="2h"
            ))

        return features

    def _generate_testing_features(
        self,
        spec: Any,
        counter: Dict[str, int]
    ) -> List[Feature]:
        """Generate testing infrastructure features."""
        features = []

        counter["testing"] = counter.get("testing", 0) + 1
        features.append(Feature(
            id=f"testing-{counter['testing']:03d}",
            description="Set up test framework and infrastructure",
            category="testing",
            priority=2,
            test_cases=["Test runner works", "Coverage reports generate"],
            estimated_effort="1h"
        ))

        return features

    def _sort_features(self, features: List[Feature]) -> List[Feature]:
        """Sort features by priority and dependencies."""
        # First sort by priority
        features.sort(key=lambda f: f.priority)

        # Then do topological sort for dependencies
        sorted_features = []
        remaining = features.copy()
        completed_ids = set()

        while remaining:
            # Find features with all dependencies met
            ready = [
                f for f in remaining
                if all(dep in completed_ids for dep in f.dependencies)
            ]

            if not ready:
                # Break cycle by taking lowest priority remaining
                ready = [remaining[0]]

            for feature in ready:
                sorted_features.append(feature)
                completed_ids.add(feature.id)
                remaining.remove(feature)

        return sorted_features

    def _resolve_dependencies(self, features: List[Feature]) -> List[Feature]:
        """Resolve and validate feature dependencies."""
        feature_ids = {f.id for f in features}

        for feature in features:
            # Remove invalid dependencies
            feature.dependencies = [
                dep for dep in feature.dependencies
                if dep in feature_ids
            ]

        return features


# Convenience function
async def generate_features(project_dir: Path, spec: Any) -> FeatureList:
    """Generate feature list from specification."""
    generator = SpecGenerator(project_dir)
    return await generator.generate(spec)
