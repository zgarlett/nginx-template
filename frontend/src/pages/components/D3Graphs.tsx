import { useEffect, useRef, type FC } from 'react';
import { axisBottom, axisLeft, extent, line, scaleLinear, scaleTime, select, type ScaleLinear, type ScaleTime } from 'd3';
import './D3Graphs.css';

export type DataPoint = {
  x: number;
  y: number;
};

export type XYChartProps = {
  data: DataPoint[];
  title: string;
  xLabel?: string;
  yLabel?: string;
  width?: number;
  height?: number;
};

export type DateRange = {
  start: Date;
  end: Date;
};

export type DateXDataPoint = {
  x: Date;
  y: number;
};

export type DateXChartProps = {
  data: DateXDataPoint[];
  dateRange?: DateRange;
  title: string;
  xLabel?: string;
  yLabel?: string;
  width?: number;
  height?: number;
};

const margins = { top: 18, right: 20, bottom: 48, left: 58 };

function getDomain(values: number[]): [number, number] {
  const [minimum, maximum] = extent(values);
  if (minimum === undefined || maximum === undefined) return [0, 1];
  if (minimum === maximum) {
    const padding = Math.abs(minimum) * 0.1 || 1;
    return [minimum - padding, maximum + padding];
  }
  return [minimum, maximum];
}

function formatValue(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function drawAxes(
  svg: SVGSVGElement,
  xScale: ScaleLinear<number, number, never>,
  yScale: ScaleLinear<number, number, never>,
  width: number,
  height: number,
  xLabel: string,
  yLabel: string,
) {
  const chart = select(svg);
  const plotWidth =  width - margins.left - margins.right;
  const plotHeight = height - margins.top - margins.bottom;

  chart.selectAll('*').remove();
  chart.append('g')
    .attr('transform', `translate(${margins.left},${height - margins.bottom})`)
    .call(axisBottom(xScale).ticks(6));
  chart.append('g')
    .attr('transform', `translate(${margins.left},${margins.top})`)
    .call(axisLeft(yScale).ticks(5));
  chart.append('text')
    .attr('class', 'd3-chart-label')
    .attr('x', margins.left + plotWidth / 2)
    .attr('y', height - 8)
    .attr('text-anchor', 'middle')
    .text(xLabel);
  chart.append('text')
    .attr('class', 'd3-chart-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(margins.top + plotHeight / 2))
    .attr('y', 16)
    .attr('text-anchor', 'middle')
    .text(yLabel);
}

function drawDateXAxis(
  svg: SVGSVGElement,
  xScale: ScaleTime<number, number, never>,
  yScale: ScaleLinear<number, number, never>,
  width: number,
  height: number,
  xLabel: string,
  yLabel: string,
) {
  const chart = select(svg);
  const plotWidth = width - margins.left - margins.right;
  const plotHeight = height - margins.top - margins.bottom;

  chart.selectAll('*').remove();
  chart.append('g')
    .attr('transform', `translate(0,${height - margins.bottom})`)
    .call(axisBottom(xScale).ticks(8));
  chart.append('g')
    .attr('transform', `translate(${margins.left},0)`)
    .call(axisLeft(yScale).ticks(5));
  chart.append('text')
    .attr('class', 'd3-chart-label')
    .attr('x', margins.left + plotWidth / 2)
    .attr('y', height - 8)
    .attr('text-anchor', 'middle')
    .text(xLabel);
  chart.append('text')
    .attr('class', 'd3-chart-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(margins.top + plotHeight / 2))
    .attr('y', 16)
    .attr('text-anchor', 'middle')
    .text(yLabel);
}

export const D3LineChart: FC<XYChartProps> = ({
  data,
  title,
  xLabel = 'X',
  yLabel = 'Y',
  width = 640,
  height = 360,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;

    const xScale = scaleLinear<number, number, never>()
      .domain(getDomain(data.map((point) => point.x)))
      .range([margins.left, width - margins.right]);
    const yScale = scaleLinear<number, number, never>()
      .domain(getDomain(data.map((point) => point.y)))
      .nice()
      .range([height - margins.bottom, margins.top]);

    drawAxes(svg, xScale, yScale, width, height, xLabel, yLabel);
    select(svg).append('path')
      .datum(data)
      .attr('class', 'd3-line')
      .attr('d', line<DataPoint>()
        .x((point: DataPoint) => xScale(point.x))
        .y((point) => yScale(point.y)));
    select(svg).append('g')
      .attr('class', 'd3-line-points')
      .selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', (point) => xScale(point.x))
      .attr('cy', (point) => yScale(point.y))
      .attr('r', 3.5)
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', (point) => `${xLabel}: ${formatValue(point.x)}, ${yLabel}: ${formatValue(point.y)}`)
      .append('title')
      .text((point) => `${xLabel}: ${formatValue(point.x)}\n${yLabel}: ${formatValue(point.y)}`);
  }, [data, height, width, xLabel, yLabel]);

  return (
    <section className="d3-chart-card">
      <h2>{title}</h2>
      {data.length === 0 ? (
        <p className="d3-chart-empty">Add data points to display this chart.</p>
      ) : (
        <svg
          ref={svgRef}
          className="d3-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
        />
      )}
    </section>
  );
};

export const D3ScatterPlot: FC<XYChartProps> = ({
  data,
  title,
  xLabel = 'X',
  yLabel = 'Y',
  width = 640,
  height = 360,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;

    const xScale = scaleLinear<number, number, never>()
      .domain(getDomain(data.map((point) => point.x)))
      .range([margins.left, width - margins.right]);
    const yScale = scaleLinear<number, number, never>()
      .domain(getDomain(data.map((point) => point.y)))
      .nice()
      .range([height - margins.bottom, margins.top]);

    drawAxes(svg, xScale, yScale, width, height, xLabel, yLabel);
    select(svg).append('g')
      .attr('class', 'd3-scatter-points')
      .selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', (point) => xScale(point.x))
      .attr('cy', (point) => yScale(point.y))
      .attr('r', 5)
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', (point) => `${xLabel}: ${formatValue(point.x)}, ${yLabel}: ${formatValue(point.y)}`)
      .append('title')
      .text((point) => `${xLabel}: ${formatValue(point.x)}\n${yLabel}: ${formatValue(point.y)}`);
  }, [data, height, width, xLabel, yLabel]);

  return (
    <section className="d3-chart-card">
      <h2>{title}</h2>
      {data.length === 0 ? (
        <p className="d3-chart-empty">Add data points to display this chart.</p>
      ) : (
        <svg
          ref={svgRef}
          className="d3-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
        />
      )}
    </section>
  );
};

export const D3DateXChart: FC<DateXChartProps> = ({
  data,
  dateRange,
  title,
  xLabel = 'Date',
  yLabel = 'Y',
  width = 640,
  height = 360,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const hasValidData = data.every((point) => Number.isFinite(point.y) && !Number.isNaN(point.x.getTime()));
  const hasValidRange = !dateRange || (
    !Number.isNaN(dateRange.start.getTime())
    && !Number.isNaN(dateRange.end.getTime())
    && dateRange.start < dateRange.end
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || data.length === 0 || !hasValidData || !hasValidRange) return;

    const dates = data.map((point) => point.x);
    let rangeStart = dateRange?.start ?? dates[0];
    let rangeEnd = dateRange?.end ?? dates[0];
    if (!dateRange) {
      for (const date of dates.slice(1)) {
        if (date < rangeStart) rangeStart = date;
        if (date > rangeEnd) rangeEnd = date;
      }
    }
    if (rangeStart.getTime() === rangeEnd.getTime()) {
      rangeStart = new Date(rangeStart.getTime() - 12 * 60 * 60 * 1000);
      rangeEnd = new Date(rangeEnd.getTime() + 12 * 60 * 60 * 1000);
    }

    const chartData = dateRange
      ? data.filter((point) => point.x >= rangeStart && point.x <= rangeEnd)
      : data;
    const xScale = scaleTime<number, number, never>()
      .domain([rangeStart, rangeEnd])
      .range([margins.left, width - margins.right]);
    const yScale = scaleLinear<number, number, never>()
      .domain(getDomain(chartData.map((point) => point.y)))
      .nice()
      .range([height - margins.bottom, margins.top]);

    drawDateXAxis(svg, xScale, yScale, width, height, xLabel, yLabel);
    select(svg).append('path')
      .datum(chartData)
      .attr('class', 'd3-line')
      .attr('d', line<DateXDataPoint>()
        .x((point) => xScale(point.x))
        .y((point) => yScale(point.y)));
    select(svg).append('g')
      .attr('class', 'd3-scatter-points')
      .selectAll('circle')
      .data(chartData)
      .join('circle')
      .attr('cx', (point) => xScale(point.x))
      .attr('cy', (point) => yScale(point.y))
      .attr('r', 5)
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', (point) => `${xLabel}: ${point.x.toLocaleDateString()}, ${yLabel}: ${formatValue(point.y)}`)
      .append('title')
      .text((point) => `${xLabel}: ${point.x.toLocaleDateString()}\n${yLabel}: ${formatValue(point.y)}`);
  }, [data, dateRange, hasValidData, hasValidRange, height, width, xLabel, yLabel]);

  const validationError = !hasValidData
    ? 'Date chart points must have valid dates and finite Y values.'
    : !hasValidRange
      ? 'The date range must contain valid dates in chronological order.'
      : null;

  return (
    <section className="d3-chart-card">
      <h2>{title}</h2>
      {validationError ? (
        <p className="d3-chart-empty" role="alert">{validationError}</p>
      ) : data.length === 0 ? (
        <p className="d3-chart-empty">Add data points to display this chart.</p>
      ) : (
        <svg
          ref={svgRef}
          className="d3-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
        />
      )}
    </section>
  );
};
