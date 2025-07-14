import 'pcap-element/dist/pcap-element.esm.min.js';
import 'pcap-element/dist/styles.css';

export default function App() {
  return (
    <div>
      <h2>React 集成 pcap-element 示例</h2>
      <pcap-element src="/your-file.pcap"></pcap-element>
    </div>
  );
} 