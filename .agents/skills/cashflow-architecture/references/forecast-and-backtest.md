# Forecast и временная кросс-валидация

Считать по docs/orchestrator/SPECIFICATION.md §§7–10 и docs/FORECASTING.md. Точечный прогноз: 8/10/12 недель по дням недели + известный/регулярный календарь; баланс накоплением. Без CatBoost/обучения ML.

Вероятность — HISTORICAL_TRAJECTORY_BOOTSTRAP целых парных 30-дневных векторов ошибок, не независимые дни. В калибровку входят только origins с завершённым горизонтом до cutoff. Минимум12 origins, 2000 сценариев по умолчанию. Вероятность периода — доля min(path)<0; null при недостатке истории; probabilityCalibrated=false до отдельной проверки.

Backtest rolling-origin тем же алгоритмом без будущих признаков/планов/поздних исправлений. MAE/RMSE в рублях, precision/recall/lead time, Brier и coverage; процент валидации не вводить. Источник метода проверки: https://otexts.robjhyndman.com/fpp2/toolbox.html#time-series-cross-validation .
