import os
import tempfile
import urllib.request
from bullmq import Job
from core.factory import select_parser
from core.models import ParserConfig


async def handle_job(job: Job, job_token: str) -> dict:
    data = job.data
    price_list_id = data['priceListId']
    file_url = data['fileUrl']
    file_name = data['fileName']

    local_path = _download_file(file_url, file_name)
    try:
        parser_config_data = data.get('parserConfig', {})
        cfg = ParserConfig(
            header_row=parser_config_data.get('header_row'),
            skip_rows=parser_config_data.get('skip_rows', []),
            price_format=parser_config_data.get('price_format', 'decimal_point'),
            encoding=parser_config_data.get('encoding', 'utf-8'),
        )
        parser = select_parser(local_path, cfg)
        result = parser.parse(local_path)

        if result.total_rows == 0:
            status = 'failed'
        elif result.errors:
            status = 'partial'
        else:
            status = 'success'

        return {
            'priceListId': price_list_id,
            'status': status,
            'parseResult': result.to_dict(),
            'errorMessage': None,
        }
    except Exception as e:
        return {
            'priceListId': price_list_id,
            'status': 'failed',
            'parseResult': None,
            'errorMessage': str(e),
        }
    finally:
        if os.path.exists(local_path):
            os.unlink(local_path)


def _download_file(url: str, filename: str) -> str:
    """Download file from URL (GCS signed URL or local path) to a temp file."""
    suffix = os.path.splitext(filename)[1] or '.tmp'
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.close()

    if url.startswith('http://') or url.startswith('https://'):
        urllib.request.urlretrieve(url, tmp.name)
    else:
        # Local path (dev mode)
        import shutil
        shutil.copy2(url, tmp.name)

    return tmp.name
