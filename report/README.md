# Project report

The four-page PDF covers the business problem, Azure service stack, system architecture, and project team. The architecture image in the root README is exported from page 3 of the same PDF.

Rebuild in Ubuntu or WSL with Python 3, ReportLab, DejaVu fonts, and Poppler installed:

```bash
python3 -m venv /tmp/ayn-report-venv
/tmp/ayn-report-venv/bin/pip install -r report/requirements.txt
/tmp/ayn-report-venv/bin/python report/build_report.py
pdftoppm -f 3 -singlefile -scale-to 2400 -png report/output/AYN_AL_SIJILL_Project_Report_Final.pdf report/assets/architecture
```

The generator reads images from `report/assets/` and the Azure service icons from `report/assets/azure/`. The website shown in the team page is an external introduction to the project contributors.

Azure service icons are from the [Microsoft Azure Architecture Center](https://learn.microsoft.com/azure/architecture/icons/).
