import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FileUploader } from './file-uploader'

const onUpload = vi.fn(async () => ({ ok: true as const, data: { documentId: 'doc-test' } }))

function selectFile(input: HTMLInputElement, file: File) {
  fireEvent.change(input, { target: { files: [file] } })
}

describe('FileUploader', () => {
  it('shows an error when the file type is not accepted', () => {
    render(<FileUploader documentType="kartu_keluarga" onUpload={onUpload} />)

    const input = screen.getByLabelText('Pilih file untuk Kartu Keluarga') as HTMLInputElement
    selectFile(
      input,
      new File(['MZ'], 'malware.exe', { type: 'application/x-msdownload' }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tipe file tidak didukung. Gunakan PDF, JPG, atau PNG.',
    )
    expect(screen.queryByRole('button', { name: 'Unggah Dokumen' })).not.toBeInTheDocument()
  })

  it('shows an error when the file is larger than the limit', () => {
    render(<FileUploader documentType="kartu_keluarga" onUpload={onUpload} maxSizeBytes={1024} />)

    const input = screen.getByLabelText('Pilih file untuk Kartu Keluarga') as HTMLInputElement
    selectFile(
      input,
      new File([new Uint8Array(2048)], 'besar.pdf', { type: 'application/pdf' }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Ukuran file maksimal 1 KB.')
  })

  it('clears the error and offers the upload action once a valid file is selected', () => {
    render(<FileUploader documentType="kartu_keluarga" onUpload={onUpload} />)

    const input = screen.getByLabelText('Pilih file untuk Kartu Keluarga') as HTMLInputElement
    selectFile(input, new File(['x'], 'malware.exe', { type: 'application/x-msdownload' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    selectFile(input, new File(['%PDF'], 'kk.pdf', { type: 'application/pdf' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unggah Dokumen' })).toBeInTheDocument()
  })
})
