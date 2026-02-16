import { getExportUrl } from '../api';
import Button from './ui/Button';

export default function ExportButtons({ runId }) {
  if (!runId) return null;

  return (
    <div className="flex gap-3">
      <a href={getExportUrl(runId)} download>
        <Button variant="secondary" size="sm">
          Export XLSX &darr;
        </Button>
      </a>
    </div>
  );
}
