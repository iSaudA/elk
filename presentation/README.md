# AYN AL-SIJILL client presentation

The PowerPoint deck has 15 slides and embedded speaker notes. The notes allocate 150 seconds to each of four presenters, for a ten-minute presentation.

## Team names

The team.json file contains Saud, Retaj, Norah, and Lama in the order shown in the Group 01 proposal. Edit this file if the final speaking order changes.

## Rebuild

From the repository root in WSL, source NVM, select the default Node version, and run:

node presentation/build-presentation.cjs

The build writes AYN_AL_SIJILL_Final_Presentation.pptx in this directory.

## Evidence and assets

Project claims come from README.md, DEPLOYMENT.md, docs/ARCHITECTURE.md, docs/EVENTS.md, and the Function source. The Azure service icons are from the Microsoft Azure Architecture Center icon pack: https://learn.microsoft.com/azure/architecture/icons/. They are used to identify Azure products in architecture and training material, with their original shapes and colors.

The checkout and customer data are synthetic. The Azure SQL reporting view is deployed and validated; a Power BI report has not been authored or published.

The comparison against the original proposal is recorded in PROPOSAL_TO_DELIVERY.md.
