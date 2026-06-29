import os from "os";

export default function (): string {
  const ifaces = os.networkInterfaces();

  let target;
  if (ifaces.Ethernet) {
    target = ifaces.Ethernet!.find((item) => item.family == "IPv4");
  } else {
    let counter = 0;
    let targetK = "";
    for (let key in ifaces) {
      if (counter === 0) {
        targetK = key;
      }
      counter++;
    }

    target = ifaces[targetK]!.find((item) => item.family == "IPv4");
  }

  return target!.address;
}
