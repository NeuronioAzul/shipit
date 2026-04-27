import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/plugins/counter.css'

export interface LightboxSlide {
  src: string
  description?: string
}

interface EvidenceLightboxProps {
  open: boolean
  index: number
  slides: LightboxSlide[]
  onClose: () => void
}

export function EvidenceLightbox({ open, index, slides, onClose }: EvidenceLightboxProps) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Zoom, Captions, Counter]}
      captions={{ descriptionTextAlign: 'center' }}
      zoom={{ maxZoomPixelRatio: 5, scrollToZoom: true }}
    />
  )
}
