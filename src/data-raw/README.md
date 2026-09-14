# Raw dataset

`secom.data` and `secom_labels.data` are the UCI **SECOM** semiconductor
manufacturing dataset, used as-is: 1567 wafer lot runs, 590 anonymized
sensor/process-parameter readings per run, pass/fail outcome + timestamp.

Source: https://archive.ics.uci.edu/dataset/179/secom

> McCann, M. & Johnston, A. (2008). SECOM [Dataset]. UCI Machine Learning
> Repository. https://doi.org/10.24432/C54305

These files are committed so `npm run import:secom` works without an extra
download step. See [`../scripts/import-secom.ts`](../scripts/import-secom.ts)
for how they're parsed and loaded, and the root `docs/known_limitations`
note on why sensors are anonymized (`S_1`..`S_590`) rather than named after
real equipment stations.
