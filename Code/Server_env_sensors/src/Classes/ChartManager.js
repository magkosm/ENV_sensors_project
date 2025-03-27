import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

class ChartManager {
    
    constructor(ctx, title, yAxis1Title, yAxis2Title, ts_start, ts_end, live = false) {
        this.ctx = ctx;
        this.title = title;
        this.yAxis1Title = yAxis1Title;
        this.yAxis2Title = yAxis2Title;
        this.ts_start = ts_start;
        this.ts_end = ts_end;
        this.live = live;
        this.chart = null;
        this.sensorData = {};//stock les infos sur les capteurs et les mesures affichées
    }
    

    async initChart(datasets, sensorData) {
        const disp2Axis = this.yAxis2Title != "";
        this.sensorData = sensorData; // Initialize sensorData
        this.chart = new Chart(this.ctx, {
            type: 'scatter',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            displayFormats: {
                                minute: 'HH:mm',
                                hour: 'HH:mm',
                                day: 'MMM dd',
                            }
                        },
                        title: {
                            display: true,
                            text: 'Temps'
                        }
                    },
                    'y-axis-1': {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        id: 'y-axis-1',
                        title: {
                            display: true,
                            text: this.yAxis1Title
                        },
                        beginAtZero: false,
                    },
                    'y-axis-2': {
                        type: 'linear',
                        display: disp2Axis,
                        position: 'right',
                        id: 'y-axis-2',
                        grid: {
                            drawOnChartArea: false // only want the grid lines for one axis to show up
                        },
                        title: {
                            display: true,
                            text: this.yAxis2Title
                        },
                        beginAtZero: false,
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: this.title,
                        color: 'black',
                        font: {
                            size: 20,
                            family: "Roboto, sans-serif"
                        },
                        padding: {
                            top: 0,  // Espace au-dessus du titre
                            bottom: 15 // Espace en dessous du titre
                        }
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: 'black',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function (tooltipItem) {
                                return `${tooltipItem.dataset.label}: ${tooltipItem.raw.y}`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateChartData(datasets, sensorData) {
        this.sensorData = sensorData; // Update sensorData

        datasets.forEach((dataset, index) => {
            const existingDatasetIndex = this.chart.data.datasets.findIndex(ds => ds.label === dataset.label);
            if (existingDatasetIndex !== -1) {
                this.chart.data.datasets[existingDatasetIndex].data = dataset.data;
                this.chart.data.datasets[existingDatasetIndex].yAxisID = dataset.yAxisID;
            } else {
                this.chart.data.datasets.push(dataset);
            }
        });

        // Remove datasets that are no longer checked
        this.chart.data.datasets = this.chart.data.datasets.filter(ds => datasets.some(d => d.label === ds.label));

        this.chart.update();
    }

    destroyChart() {
        if (this.chart) {
            this.chart.destroy();
        }
    }

    async reinitializeChart(datasets, sensorData, title, yAxis1Title, yAxis2Title, ts_start, ts_end) {
        this.destroyChart();
        this.title = title;
        this.yAxis1Title = yAxis1Title;
        this.yAxis2Title = yAxis2Title;
        this.ts_start = ts_start;
        this.ts_end = ts_end;
        await this.initChart(datasets, sensorData);
    }
}

export default ChartManager;