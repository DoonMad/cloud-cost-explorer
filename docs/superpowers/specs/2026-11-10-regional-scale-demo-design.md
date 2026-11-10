# Regional Scale Demo and GitHub Setup — Design

## Intent
Give the Cloud Cost Explorer a larger, presentation-ready example that makes its Dijkstra versus DAG dynamic-programming comparison tangible, then prepare the static project for a GitHub repository.

## Goals
- Add a fictional, clearly labeled, multi-region workflow with 14 stages and six candidate resources at each stage (84 nodes and 468 adjacent-stage edges before filtering).
- Keep the existing linear, layered DAG model and ensure each displayed candidate remains an alternative for that stage, not a concurrently required branch.
- Count the algorithms' actual node/edge checks and show them beside complexity and runtime; retain the warning that benchmark timings are noisy and do not establish a universal winner.
- Make the larger graph usable by scrolling and ensure the presentation example can be loaded directly from the UI.
- Prepare a clean local Git repository with appropriate ignores and GitHub-oriented setup instructions; never include the research PDF, local lesson screenshots, secrets, or cloud credentials.

## Approaches considered
1. Add a wider/deeper layered DAG scenario (selected): directly exercises the model and preserves correctness; limitation: it models a sequential workflow with alternatives, not all branches of a real big-data architecture.
2. Redesign the optimizer and interface for arbitrary branches and joins: could express parallel workflows but requires defining whether branches are optional/required and how shared costs are counted; too broad for this course-demo improvement.

## Constraints
- No live provider pricing, credentials, infrastructure provisioning, or production-app changes.
- All example prices and provider labels are fictional and must be labeled as such.
- Preserve the paper-style scan Dijkstra and DAG DP; both must optimize the same weights and return the same minimum score.
- GitHub repository creation/push depends on an available authenticated GitHub route; prepare locally first and do not claim publication until confirmed.

## Success criteria
- The UI can load a multi-region 14-stage/6-candidate example and display its directed graph and route.
- The comparison shows graph dimensions and correctly counted work for both algorithms.
- The local project has Git initialized and contains only intended source/documentation assets in its initial commit candidate.
- README explains local use, the example's assumptions, and how to publish the static app via GitHub Pages.
