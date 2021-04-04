import * as React from 'react'
import { Dataset } from '../../types/Dataset';
import { useState } from 'react';
import io from 'socket.io-client';
import { fileServerURL } from '../../utils/config'
import { UploadFileByURL } from './UploadFileByURL';
import { LoadSavedDataset } from './LoadSavedDataset';
import styles from './DataInput.module.css';
// import LoadDemoDataset from './LoadDemoDataset';
import UploadFile from './UploadFile';

interface DataInputProps {
    changeDataset: (dataset: Dataset) => any;
    appendToDataset: (dataset: Dataset) => any;
    setLoadingInParent: (loading: boolean) => void;
    fetchDataset: (path: string) => Promise<void>;
}

/**
 * Component that groups together and manages all the different ways that the user can load a dataset 
 */
export const DataInput: React.FC<DataInputProps> = (props: DataInputProps) => {
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [batchesProgress, setBatchesProgress] = useState<string | null>(null);
    const [socket, setSocket] = useState<SocketIOClient.Socket | null>(null);
    const [uplaodXHRRequest, setUploadXHRRequest] = useState<XMLHttpRequest | null>(null);

    const getDatasetProgressivelyFromSocket = (filePath: string, name: string) => {
        const socket = io(fileServerURL);

        setSocket(socket);
        socket.on('connect', () => {
            // console.log("Connected to socket");
        });
        socket.emit('requestDataset', {
            name,
            filePath
        });
        socket.on('newDataset', (data: any) => {
            let dataset = data.data.extractedDataset
            setBatchesProgress(data.batch);
            props.changeDataset(dataset as Dataset);
            if (data.lastBatch) cancelSocket();
        })
        socket.on('batch', (data: any) => {
            let dataset = data.data.extractedDataset
            setBatchesProgress(data.batch);
            props.appendToDataset(dataset as Dataset);
            if (data.lastBatch) cancelSocket();
        })
    }

    const cancelSocket = () => {
        if (socket) socket.close();
        props.setLoadingInParent(false);
        setBatchesProgress(null);
        setUploadProgress(null);
    }

    const cancelUploadRequest = () => {
        if (uplaodXHRRequest) {
            uplaodXHRRequest.abort();
            setUploadProgress(null);
            setUploadXHRRequest(null);
        }
    }

    return (
        <React.Fragment>
            <div className={styles.uploadProgress}>
                {uploadProgress && uploadProgress < 100 && <b>Uploading file: {uploadProgress} %</b>}
                {uploadProgress && uploadProgress === 100 && <b>Converting to dataset...</b>}
                {uplaodXHRRequest && uploadProgress && uploadProgress !== 100 && <button className='cancelButton' onClick={() => cancelUploadRequest()}>Cancel upload</button>}
                {downloadProgress && downloadProgress > 0 && <b>Downloading...{downloadProgress}%</b>}
                {batchesProgress &&
                    <span>
                        <b>{batchesProgress}</b>
                        <button className={styles.cancelButton} onClick={cancelSocket}>Cancel</button>
                    </span>}
                <br></br>
            </div>
            <div>
                <span>Load PCAP File from: </span>
                <UploadFile changeDataset={props.changeDataset} setDownloadProgress={setDownloadProgress} cancelSocket={cancelSocket} setLoadingInDashboard={props.setLoadingInParent} 
                    getDatasetProgressivelyFromSocket={getDatasetProgressivelyFromSocket} setUploadProgress={setUploadProgress} setUploadXHRRequest={setUploadXHRRequest}/>
                <UploadFileByURL
                    getDatasetProgressivelyFromSocket={getDatasetProgressivelyFromSocket}
                    setLoading={props.setLoadingInParent}
                    setDownloadProgress={setDownloadProgress}
                    setUploadProgress={setUploadProgress}
                />
            </div>
            {/* <div>
                <span>Task and demo datasets:</span>
                <LoadDemoDataset changeDataset={props.changeDataset} setDownloadProgress={setDownloadProgress} cancelSocket={cancelSocket} setLoadingInDashboard={props.setLoadingInParent} />
            </div> */}
            <div>
                <span>Uploaded Datasets: </span>
                <LoadSavedDataset changeDataset={props.changeDataset} setDownloadProgress={setDownloadProgress} cancelSocket={cancelSocket} setLoadingInDashboard={props.setLoadingInParent} />
            </div>
        </React.Fragment>
    )
}