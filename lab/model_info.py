from huggingface_hub import HfApi

api = HfApi()
model_name = ["onnx-community/whisper-base", "onnx-community/whisper-small", "onnx-community/whisper-large-v3-turbo"]
for i in model_name:
    model_name = i
    print(f"\n{model_name}: \n")
    info = api.model_info(model_name, files_metadata=True)
    # print("\nDecoder Model:\n")
    # for i in info.siblings:
    #     if i.rfilename.startswith("onnx/decoder_model"):
    #         #rint(f"{i.rfilename}, {i.size / 1000000:.1f}")
    #         pass
    # print("\nEncoder Model:\n")
    # for j in info.siblings:
    #     if j.rfilename.startswith("onnx/encoder_model"):
    #         print(f"{j.rfilename}, {j.size / 1000000:.1f}")
    #         pass

    encoders = {}
    decoders = {}

    for i in info.siblings:
        name = i.rfilename
        mb = i.size / 1000000
        if name.startswith("onnx/encoder_model"):
            pr = name.removeprefix("onnx/encoder_model").removesuffix(".onnx")
            encoders[pr] = mb
        elif name.startswith("onnx/decoder_model_merged"):
            pr = name.removeprefix("onnx/decoder_model_merged").removesuffix(".onnx")
            decoders[pr] = mb
    #print(f"\nencoders:, {encoders}")
    #print(f"\ndecoders: , {decoders}")

    for pr in encoders:
        if pr in decoders:
            total = encoders[pr] + decoders[pr]
            print(f"\n{pr}  {encoders[pr]:.1f} + {decoders[pr]:.1f} = {total:.1f}")