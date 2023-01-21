/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MultiplexerSink.h"

namespace mozilla {

MultiplexerSink::MultiplexerSink(MediaSink* aVideoSink,
                                 MediaSink* aDecodedStream)
    : mVideoSink(aVideoSink), mDecodedStream(aDecodedStream) {}

RefPtr<MultiplexerSink::EndedPromise> MultiplexerSink::OnEnded(
    TrackType aType) {
  return mVideoSink->OnEnded(aType);
}

media::TimeUnit MultiplexerSink::GetEndTime(TrackType aType) const {
  return mVideoSink->GetEndTime(aType);
}

media::TimeUnit MultiplexerSink::GetPosition(TimeStamp* aTimeStamp) {
  return mVideoSink->GetPosition(aTimeStamp);
}

bool MultiplexerSink::HasUnplayedFrames(TrackType aType) const {
  return mVideoSink->HasUnplayedFrames(aType);
}

media::TimeUnit MultiplexerSink::UnplayedDuration(TrackType aType) const {
  return mVideoSink->UnplayedDuration(aType);
}

void MultiplexerSink::SetVolume(double aVolume) {
  // We do not need to set it for mDecodedStream because according to the w3c
  // standard, the volume of the captured stream is not affected by the volume
  // of the media element.
  mVideoSink->SetVolume(aVolume);
}

void MultiplexerSink::SetStreamName(const nsAString& aStreamName) {
  mVideoSink->SetStreamName(aStreamName);
  mDecodedStream->SetStreamName(aStreamName);
}

void MultiplexerSink::SetPlaybackRate(double aPlaybackRate) {
  mVideoSink->SetPlaybackRate(aPlaybackRate);
  mDecodedStream->SetPlaybackRate(aPlaybackRate);
}

void MultiplexerSink::SetPreservesPitch(bool aPreservesPitch) {
  // We do not need to set it for mDecodedStream because according to the w3c
  // standard, the audio MUST be time-stretched.
  mVideoSink->SetPreservesPitch(aPreservesPitch);
}

void MultiplexerSink::SetPlaying(bool aPlaying) {
  mVideoSink->SetPlaying(aPlaying);
  mDecodedStream->SetPlaying(aPlaying);
}

double MultiplexerSink::PlaybackRate() const {
  return mVideoSink->PlaybackRate();
}

void MultiplexerSink::Redraw(const VideoInfo& aInfo) {
  mVideoSink->Redraw(aInfo);
  mDecodedStream->Redraw(aInfo);
}

nsresult MultiplexerSink::Start(const media::TimeUnit& aStartTime,
                                const MediaInfo& aInfo) {
  nsresult videoSinkRes = mVideoSink->Start(aStartTime, aInfo);
  nsresult decodedStreamRes = mDecodedStream->Start(aStartTime, aInfo);
  if (videoSinkRes == decodedStreamRes) {
    return videoSinkRes;
  } else if (videoSinkRes == NS_OK) {
    return decodedStreamRes;
  } else if (decodedStreamRes == NS_OK) {
    return videoSinkRes;
  } else {
    return NS_ERROR_FAILURE;
  }
}

void MultiplexerSink::Stop() {
  mVideoSink->Stop();
  mDecodedStream->Stop();
}

bool MultiplexerSink::IsStarted() const { return mVideoSink->IsStarted(); }

bool MultiplexerSink::IsPlaying() const { return mVideoSink->IsPlaying(); }

const AudioDeviceInfo* MultiplexerSink::AudioDevice() const {
  return mVideoSink->AudioDevice();
}

void MultiplexerSink::Shutdown() {
  mVideoSink->Shutdown();
  mDecodedStream->Shutdown();
}

void MultiplexerSink::SetSecondaryVideoContainer(
    VideoFrameContainer* aSecondary) {
  mVideoSink->SetSecondaryVideoContainer(aSecondary);
  mDecodedStream->SetSecondaryVideoContainer(aSecondary);
}

void MultiplexerSink::GetDebugInfo(dom::MediaSinkDebugInfo& aInfo) {
  // TODO: get both
  mVideoSink->GetDebugInfo(aInfo);
}

}  // namespace mozilla
