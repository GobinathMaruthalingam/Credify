# Certificate Generation and Emailing Pipeline

This project provides an automated pipeline to generate custom certificates as PDFs from a template and email them out to participants listed in a CSV file.

## Features

- **Coordinate Mapping Tool**: Use `mapper.py` with OpenCV to visually select the bounding box on your template image where the participant's name should be overlaid.
- **Dynamic Font Scaling**: The generation script dynamically scales down the chosen font size if the participant's name is too long to fit in the designated bounding box.
- **Automated PDF Generation**: Generates high-quality PDFs for every participant.
- **Secure Emailing**: Reads credentials from a `.env` file and emails certificates using SMTP with a batching delay to prevent rate-limiting.

## Setup Instructions

1. **Install Python 3** on your system.
2. **Clone this repository** (or download the files).
3. **Create a virtual environment**:
   ```bash
   python -m venv venv
   ```
4. **Activate the virtual environment**:
   - Windows: `.\venv\Scripts\Activate.ps1` (or `.bat`)
   - Mac/Linux: `source venv/bin/activate`
5. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
6. **Set up environment variables**:
   - Copy `.env.example` to `.env`.
   - Update `.env` with your real email and App Password.
     - *Note: If using Gmail, you must generate an [App Password](https://myaccount.google.com/apppasswords).*

## Usage

1. **Configure Settings**:
   - Place your base certificate image in the project directory (e.g., `template.png`).
   - Place your participant data in `participants.csv` (must have `name` and `email` columns).
   - Update `config.py` to point to your chosen true-type font (`.ttf`).
2. **Map the Coordinates**:
   - Run the mapper script:
     ```bash
     python mapper.py
     ```
   - Follow the instructions to click and drag a rectangle over the region where you want the names to appear. Press `SPACE` to confirm the region.
   - Copy the output properties (`BBOX_X`, `BBOX_Y`, `BBOX_WIDTH`, `BBOX_HEIGHT`) and paste them into your `config.py` file.
3. **Generate Certificates**:
   ```bash
   python generate.py
   ```
   - Check the `generated/` folder to review the PDFs before sending.
4. **Distribute via Email**:
   ```bash
   python mailer.py
   ```
   - The script will securely email the generated PDFs to the participants at a set delay rate to respect SMTP limits.

## Project Structure

- `config.py`: File paths, bounding box configurations, and email setup.
- `mapper.py`: OpenCV utility to find template bounding box coordinates visually.
- `generate.py`: Main script to overlay text onto the template, scale font, and save as PDF.
- `mailer.py`: SMTP script to automatically email participants their matching PDFs.
- `.env`: (Ignored via git) Stores your private email and App Password.
- `participants.csv` / `template.png`: Your input data files.
