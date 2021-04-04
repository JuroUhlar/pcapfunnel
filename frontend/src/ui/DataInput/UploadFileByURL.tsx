import * as React from 'react'
import { fileServerURL } from '../../utils/config';
import io from 'socket.io-client';

interface UploadFileByURLProps {
    getDatasetProgressivelyFromSocket: (filePath: string, name: string) => void;
    setLoading: (loading: boolean) => void;
    setDownloadProgress: React.Dispatch<React.SetStateAction<number | null>>;
    setUploadProgress: React.Dispatch<React.SetStateAction<number | null>>;
}

/**
 * Component that allows the user to submit a PCAP file to the server from a public URL and display it as a dataset
 */
export class UploadFileByURL extends React.PureComponent<UploadFileByURLProps> {
    constructor(props: UploadFileByURLProps) {
        super(props);
        this.textInput = React.createRef();
    }

    textInput: React.RefObject<HTMLInputElement>;

    handleSubmitWithSocket = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (this.textInput.current) {
            let url = this.textInput.current.value;
            this.sendURLToSocket(url);
        }
    }
    
    private sendURLToSocket(url: string) {
        const socket = io(fileServerURL);
        socket.on('connect', () => {
            // console.log("Connected to socket");
        });
        this.props.setLoading(true);
        socket.emit('submitPcapUrl', {
            url
        });
        socket.on('downloadProgress', (percent: number) => {
            this.props.setDownloadProgress(percent);
        });
        socket.on('filePath', (filePath: string) => {
            // console.log(filePath);
            this.props.setLoading(false);
            this.props.setDownloadProgress(null);
            this.props.setUploadProgress(100);
            this.props.getDatasetProgressivelyFromSocket(filePath, getNameFromFilePath(filePath));
            socket.close();
        });
        socket.on('downloadError', (error: string) => {
            console.log(error);
            alert(error);
            this.props.setLoading(false);
            this.props.setDownloadProgress(null);
            socket.close();
        });
    }

    submitURLPrompt = () => {
        let url = prompt('Sumbit a publicly available PCAP file by its URL: ', 'https://s3.amazonaws.com/tcpreplay-pcap-files/test.pcap');
        if (url !== null && url !== '') {
            this.sendURLToSocket(url);
        }
    }

    render() {
        return (
            <React.Fragment>
                <button onClick={this.submitURLPrompt}>URL</button>
            </React.Fragment>

        );
    }
}

const getNameFromFilePath = (filePath: string) => {
    let parts = filePath.split('/');
    let file = parts[parts.length - 1];
    let name = file.split('.')[0];
    return name;
}
