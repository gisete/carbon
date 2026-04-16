# Weather Background Images

Place background images here. They are served statically from `/images/weather/`.

## Naming Convention

Images are selected based on the current weather condition slug, with daily rotation via `dayOfYear % numImages`.

```
bg-weather-default.jpg        ← required fallback (used when no slug match found)
bg-weather-clear.jpg
bg-weather-clear-2.jpg
bg-weather-partly-cloudy.jpg
bg-weather-partly-cloudy-2.jpg
bg-weather-cloudy.jpg
bg-weather-rain.jpg
bg-weather-drizzle.jpg
bg-weather-fog.jpg
bg-weather-snow.jpg
bg-weather-storm.jpg
```

## Condition Slugs

| Slug            | IPMA idWeatherType values  |
| --------------- | -------------------------- |
| `clear`         | 1                          |
| `partly-cloudy` | 2, 3, 25                   |
| `cloudy`        | 4, 5, 27                   |
| `drizzle`       | 6, 7, 10, 13, 15           |
| `rain`          | 8, 9, 11, 14               |
| `fog`           | 16, 17, 26                 |
| `snow`          | 18, 21, 22                 |
| `storm`         | 19, 20, 23                 |

## Recommended Specs

- **Resolution**: 800×480px minimum (landscape)
- **Format**: JPEG
- **Content**: Leave the right side relatively uncluttered (the weather card sits top-right)
