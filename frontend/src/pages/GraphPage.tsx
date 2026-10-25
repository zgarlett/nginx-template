import { D3DateXChart, type DateXDataPoint } from './components/D3Graphs';
import './GraphPage.css';


const dateSampleData: DateXDataPoint[] = [
  { x: new Date('2025-01-08T12:00:00'), y: 142 },
  { x: new Date('2025-01-17T12:00:00'), y: 118 },
  { x: new Date('2025-02-02T12:00:00'), y: 176 },
  { x: new Date('2025-02-14T12:00:00'), y: 151 },
  { x: new Date('2025-03-04T12:00:00'), y: 203 },
  { x: new Date('2025-03-19T12:00:00'), y: 184 },
  { x: new Date('2025-04-06T12:00:00'), y: 229 },
];

const dateRange = {
  start: new Date('2025-01-01T12:00:00'),
  end: new Date('2025-04-15T12:00:00'),
};

const GraphPage = () => (
  <main className="graph-page">
    <header className="graph-page-heading">
      <p className="graph-page-eyebrow">DATA EXPLORATION</p>
      <h1>Charts</h1>
      <p>Reusable D3 charts built from x and y data points.</p>
    </header>
    <div className="graph-grid">
      <D3DateXChart
        data={dateSampleData}
        dateRange={dateRange}
        title="Spending over time"
        xLabel="Transaction date"
        yLabel="Amount ($)"
      />
    </div>
  </main>
);

export default GraphPage;