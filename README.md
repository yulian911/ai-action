AI Reviewer
AI Reviewer is a GitHub Action that uses Google AI Studio to review Pull Requests.

Usage
name: AI Reviewer

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: przeprogramowani/ai-action@master
        with:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
Inputs
GOOGLE_API_KEY: The API key for Google AI Studio.